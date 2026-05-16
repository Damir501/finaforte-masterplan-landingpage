<?php
/**
 * Calendly -> dashboard meetlaag + Brevo contact update.
 *
 * Meet-only webhook: registreert `invitee.created` als `call_booked` in de
 * first-party eventlog en zet call-attributen op het Brevo-contact. Deze endpoint
 * verstuurt bewust geen F5-bevestigingsmail; die blijft via Zapier lopen.
 *
 * Server-side secrets uit api/.env:
 *   BREVO_API_KEY                       Brevo contacts API
 *   CALENDLY_TRACKING_WEBHOOK_SECRET    signing secret van deze Calendly webhook
 *
 * Calendly setup:
 *   POST URL: https://masterplan.finaforte.nl/api/calendly-track-webhook.php
 *   Event:    invitee.created
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store');

const MARKETING_EVENTS_FILE = '/tmp/ff-marketing-events.jsonl';
const MARKETING_EVENTS_MAX_BYTES = 5242880; // 5 MB
const LOG_PREFIX = '[calendly-track] ';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method-not-allowed']);
    exit;
}

$env = load_env(__DIR__ . '/.env');
$apiKey = (string)($env['BREVO_API_KEY'] ?? '');
$webhookSecret = (string)($env['CALENDLY_TRACKING_WEBHOOK_SECRET'] ?? '');

if ($apiKey === '' || $webhookSecret === '') {
    error_log(LOG_PREFIX . 'BREVO_API_KEY or CALENDLY_TRACKING_WEBHOOK_SECRET missing');
    http_response_code(500);
    echo json_encode(['error' => 'config-invalid']);
    exit;
}

$raw = file_get_contents('php://input');
if ($raw === false || $raw === '') {
    http_response_code(400);
    echo json_encode(['error' => 'empty-body']);
    exit;
}

verify_calendly_signature($raw, $webhookSecret);

$payload = json_decode($raw, true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid-json']);
    exit;
}

$eventType = (string)($payload['event'] ?? '');
if ($eventType !== 'invitee.created') {
    http_response_code(200);
    echo json_encode(['ok' => true, 'skipped' => $eventType]);
    exit;
}

$invitee = $payload['payload'] ?? [];
if (!is_array($invitee)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid-payload']);
    exit;
}

$email = filter_var($invitee['email'] ?? '', FILTER_VALIDATE_EMAIL);
if (!$email) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid-invitee-email']);
    exit;
}
$email = substr(strtolower((string)$email), 0, 254);

$fullName = sanitize_string((string)($invitee['name'] ?? ''), 160);
$parts = preg_split('/\s+/', trim($fullName), 2) ?: [];
$firstName = (string)($parts[0] ?? '');
$lastName = (string)($parts[1] ?? '');

$event = is_array($invitee['scheduled_event'] ?? null) ? $invitee['scheduled_event'] : [];
$eventName = sanitize_string((string)($event['name'] ?? 'Kennismakingsgesprek'), 160);
$eventUri = sanitize_string((string)($event['uri'] ?? ''), 300);
$inviteeUri = sanitize_string((string)($invitee['uri'] ?? ''), 300);
$startIso = (string)($event['start_time'] ?? '');

$location = is_array($event['location'] ?? null) ? $event['location'] : [];
$locType = sanitize_token((string)($location['type'] ?? ''), 60);
$joinUrl = safe_https_url((string)($location['join_url'] ?? $location['location'] ?? ''));

$formattedCall = format_call_time($startIso);
$locationLabel = location_label($locType);

$brevoAttrs = [
    'CALL_BOOKED' => 'yes',
    'CALL_DATE' => $formattedCall['date'],
    'CALL_TIME' => $formattedCall['time'],
    'CALL_LOCATION' => $locationLabel,
    'CALL_TIMESTAMP' => $formattedCall['timestamp'],
    'CALL_JOIN_URL' => $joinUrl,
    'B1_SENT' => '',
];
if ($firstName !== '') {
    $brevoAttrs['FIRSTNAME'] = $firstName;
}
if ($lastName !== '') {
    $brevoAttrs['LASTNAME'] = $lastName;
}

$contactResp = brevo_call(
    'https://api.brevo.com/v3/contacts',
    'POST',
    [
        'email' => $email,
        'attributes' => $brevoAttrs,
        'updateEnabled' => true,
    ],
    $apiKey
);

$tracking = is_array($invitee['tracking'] ?? null) ? $invitee['tracking'] : [];
$eventStored = append_marketing_event([
    'ts' => date('c'),
    'event' => 'call_booked',
    'path' => '/calendly/',
    'visitor_id' => null,
    'session_id' => null,
    'referrer_domain' => 'calendly.com',
    'dedupe_id' => event_dedupe_id($inviteeUri, $eventUri, $email, $startIso, $webhookSecret),
    'lead_hash' => hash_hmac('sha256', $email, $webhookSecret),
    'properties' => array_filter([
        'source' => 'calendly',
        'event_name' => $eventName,
        'call_date' => $formattedCall['date'],
        'call_time' => $formattedCall['time'],
        'location_type' => $locType,
        'utm_source' => sanitize_string((string)($tracking['utm_source'] ?? ''), 120),
        'utm_medium' => sanitize_string((string)($tracking['utm_medium'] ?? ''), 120),
        'utm_campaign' => sanitize_string((string)($tracking['utm_campaign'] ?? ''), 120),
        'utm_content' => sanitize_string((string)($tracking['utm_content'] ?? ''), 120),
        'utm_term' => sanitize_string((string)($tracking['utm_term'] ?? ''), 120),
    ], static fn($value) => $value !== '' && $value !== null),
]);

$ok = ($contactResp['ok'] ?? false) && $eventStored;
http_response_code($ok ? 200 : 502);
echo json_encode([
    'ok' => $ok,
    'contact' => $contactResp['status'] ?? null,
    'event_stored' => $eventStored,
]);

function load_env(string $path): array {
    if (!is_readable($path)) {
        error_log(LOG_PREFIX . '.env missing at ' . $path);
        return [];
    }
    $env = @parse_ini_file($path);
    return is_array($env) ? $env : [];
}

function verify_calendly_signature(string $raw, string $webhookSecret): void {
    $sigHeader = $_SERVER['HTTP_CALENDLY_WEBHOOK_SIGNATURE'] ?? '';
    if ($sigHeader === '') {
        http_response_code(401);
        echo json_encode(['error' => 'missing-signature']);
        exit;
    }

    $sigParts = [];
    foreach (explode(',', $sigHeader) as $part) {
        $kv = explode('=', trim($part), 2);
        if (count($kv) === 2) {
            $sigParts[$kv[0]] = $kv[1];
        }
    }

    $timestamp = (string)($sigParts['t'] ?? '');
    $signature = (string)($sigParts['v1'] ?? '');
    if ($timestamp === '' || $signature === '' || !ctype_digit($timestamp)) {
        http_response_code(401);
        echo json_encode(['error' => 'malformed-signature']);
        exit;
    }

    if (abs(time() - (int)$timestamp) > 300) {
        error_log(LOG_PREFIX . 'stale signature timestamp: ' . $timestamp);
        http_response_code(401);
        echo json_encode(['error' => 'stale-signature']);
        exit;
    }

    $expected = hash_hmac('sha256', $timestamp . '.' . $raw, $webhookSecret);
    if (!hash_equals($expected, $signature)) {
        error_log(LOG_PREFIX . 'signature mismatch');
        http_response_code(401);
        echo json_encode(['error' => 'invalid-signature']);
        exit;
    }
}

function brevo_call(string $url, string $method, array $body, string $apiKey): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Accept: application/json',
            'api-key: ' . $apiKey,
        ],
        CURLOPT_TIMEOUT => 8,
        CURLOPT_CONNECTTIMEOUT => 3,
    ]);

    $resp = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);

    if ($resp === false) {
        error_log(LOG_PREFIX . 'brevo curl fail: ' . $err);
        return ['ok' => false, 'status' => 0, 'error' => $err];
    }

    $ok = ($code >= 200 && $code < 300);
    if (!$ok) {
        error_log(LOG_PREFIX . 'brevo HTTP ' . $code . ': ' . substr((string)$resp, 0, 500));
    }
    return ['ok' => $ok, 'status' => $code];
}

function append_marketing_event(array $record): bool {
    rotate_if_needed(MARKETING_EVENTS_FILE);
    $encoded = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($encoded === false) {
        return false;
    }
    return @file_put_contents(MARKETING_EVENTS_FILE, $encoded . PHP_EOL, FILE_APPEND | LOCK_EX) !== false;
}

function rotate_if_needed(string $file): void {
    if (is_readable($file) && filesize($file) !== false && filesize($file) > MARKETING_EVENTS_MAX_BYTES) {
        @rename($file, $file . '.1');
    }
}

function event_dedupe_id(string $inviteeUri, string $eventUri, string $email, string $startIso, string $secret): string {
    $source = $inviteeUri !== '' ? $inviteeUri : ($eventUri . '|' . $email . '|' . $startIso);
    return hash_hmac('sha256', $source, $secret);
}

function format_call_time(string $startIso): array {
    $out = ['date' => '', 'time' => '', 'timestamp' => ''];
    if ($startIso === '') {
        return $out;
    }

    try {
        $dt = new DateTimeImmutable($startIso);
        $out['timestamp'] = $dt->format(DATE_ATOM);
        $dt = $dt->setTimezone(new DateTimeZone('Europe/Amsterdam'));
        $dayNames = ['', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
        $monthNames = ['', 'januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
        $out['date'] = sprintf(
            '%s %d %s %d',
            $dayNames[(int)$dt->format('N')],
            (int)$dt->format('j'),
            $monthNames[(int)$dt->format('n')],
            (int)$dt->format('Y')
        );
        $out['time'] = $dt->format('H:i');
    } catch (Throwable $e) {
        error_log(LOG_PREFIX . 'datetime parse error: ' . $e->getMessage());
    }

    return $out;
}

function location_label(string $locType): string {
    return match ($locType) {
        'google_conference' => 'online via Google Meet',
        'zoom' => 'online via Zoom',
        'microsoft_teams' => 'online via Microsoft Teams',
        'physical' => 'op kantoor',
        'phone', 'inbound_call', 'outbound_call' => 'telefonisch',
        default => 'volgens Calendly-instelling',
    };
}

function safe_https_url(string $value): string {
    $value = trim($value);
    if ($value === '') {
        return '';
    }
    $parts = parse_url($value);
    if (!is_array($parts) || ($parts['scheme'] ?? '') !== 'https') {
        return '';
    }
    return sanitize_string($value, 500);
}

function sanitize_token(string $value, int $maxLen): string {
    $value = strtolower(trim($value));
    $value = preg_replace('/[^a-z0-9_.:-]+/', '-', $value) ?? '';
    return substr(trim($value, '-'), 0, $maxLen);
}

function sanitize_string(string $value, int $maxLen): string {
    $value = preg_replace('/[\r\n\t\x00-\x1F]/u', ' ', trim($value)) ?? '';
    $value = preg_replace('/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/i', '[redacted-email]', $value) ?? '';
    return mb_substr($value, 0, $maxLen);
}
