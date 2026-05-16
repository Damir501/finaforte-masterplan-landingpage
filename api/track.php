<?php
/**
 * First-party marketing event tracker.
 *
 * Doel: funnel-events AVG-arm vastleggen voor het dashboard, zonder e-mailadressen,
 * namen, telefoonnummers of andere directe PII. De frontend stuurt alleen
 * pseudonieme visitor/session-id's en context zoals eventnaam, pad, CTA en UTM.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method-not-allowed']);
    exit;
}

const TRACK_FILE = '/tmp/ff-marketing-events.jsonl';
const TRACK_FILE_MAX_BYTES = 5242880; // 5 MB, daarna simpele rotatie

$raw = file_get_contents('php://input');
if ($raw === false || $raw === '') {
    http_response_code(400);
    echo json_encode(['error' => 'empty-body']);
    exit;
}

$payload = json_decode($raw, true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid-json']);
    exit;
}

$event = sanitize_token((string)($payload['event'] ?? ''), 60);
if ($event === '') {
    http_response_code(400);
    echo json_encode(['error' => 'invalid-event']);
    exit;
}

$props = sanitize_props(is_array($payload['properties'] ?? null) ? $payload['properties'] : []);
$path = sanitize_path((string)($payload['path'] ?? ($props['path'] ?? '')));
$referrer = sanitize_string((string)($payload['referrer'] ?? ''), 500);
$referrerDomain = referrer_domain($referrer);

$record = [
    'ts' => date('c'),
    'event' => $event,
    'path' => $path,
    'visitor_id' => hash_optional_id((string)($payload['visitor_id'] ?? '')),
    'session_id' => hash_optional_id((string)($payload['session_id'] ?? '')),
    'referrer_domain' => $referrerDomain,
    'properties' => $props,
];

rotate_if_needed(TRACK_FILE);
$encoded = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($encoded === false || @file_put_contents(TRACK_FILE, $encoded . PHP_EOL, FILE_APPEND | LOCK_EX) === false) {
    error_log('[track] unable to append event');
    http_response_code(202);
    echo json_encode(['ok' => false, 'stored' => false]);
    exit;
}

http_response_code(202);
echo json_encode(['ok' => true]);

function sanitize_token(string $value, int $maxLen): string {
    $value = strtolower(trim($value));
    $value = preg_replace('/[^a-z0-9_.:-]+/', '-', $value) ?? '';
    return substr(trim($value, '-'), 0, $maxLen);
}

function sanitize_path(string $value): string {
    $value = sanitize_string($value, 300);
    if ($value === '') return '';
    $parts = @parse_url($value);
    if (is_array($parts)) {
        $path = (string)($parts['path'] ?? $value);
        $query = [];
        if (!empty($parts['query'])) {
            parse_str((string)$parts['query'], $query);
        }
        $safeQuery = [];
        foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'p'] as $key) {
            if (isset($query[$key]) && is_scalar($query[$key])) {
                $safeQuery[$key] = sanitize_string((string)$query[$key], 120);
            }
        }
        return $path . ($safeQuery ? '?' . http_build_query($safeQuery) : '');
    }
    return $value;
}

function sanitize_props(array $props, int $depth = 0): array {
    if ($depth > 2) return [];
    $out = [];
    $count = 0;
    foreach ($props as $key => $value) {
        if ($count++ >= 40) break;
        $key = sanitize_token((string)$key, 60);
        if ($key === '' || is_blocked_key($key)) continue;

        if (is_array($value)) {
            $out[$key] = sanitize_props(array_slice($value, 0, 20, true), $depth + 1);
        } elseif (is_bool($value) || is_int($value) || is_float($value) || $value === null) {
            $out[$key] = $value;
        } elseif (is_scalar($value)) {
            $out[$key] = sanitize_string((string)$value, 300);
        }
    }
    return $out;
}

function is_blocked_key(string $key): bool {
    static $blocked = [
        'email', 'e-mail', 'mail', 'firstname', 'first-name', 'first_name',
        'lastname', 'last-name', 'last_name', 'name', 'naam', 'phone',
        'tel', 'telephone', 'mobile', 'adres', 'address',
    ];
    return in_array($key, $blocked, true);
}

function sanitize_string(string $value, int $maxLen): string {
    $value = preg_replace('/[\r\n\t\x00-\x1F]/u', ' ', trim($value)) ?? '';
    $value = preg_replace('/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/i', '[redacted-email]', $value) ?? '';
    return mb_substr($value, 0, $maxLen);
}

function hash_optional_id(string $value): ?string {
    $value = sanitize_string($value, 120);
    if ($value === '') return null;
    return hash('sha256', $value);
}

function referrer_domain(string $referrer): ?string {
    if ($referrer === '') return null;
    $parts = @parse_url($referrer);
    if (!is_array($parts) || empty($parts['host'])) return null;
    $host = strtolower((string)$parts['host']);
    if ($host === 'masterplan.finaforte.nl') return 'internal';
    return preg_replace('/^www\./', '', $host) ?: null;
}

function rotate_if_needed(string $file): void {
    if (is_readable($file) && filesize($file) !== false && filesize($file) > TRACK_FILE_MAX_BYTES) {
        @rename($file, $file . '.1');
    }
}
