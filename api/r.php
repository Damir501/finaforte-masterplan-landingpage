<?php
/**
 * First-party redirect tracker.
 *
 * Gebruik voor meetbare links in F4/N1 mails, LinkedIn posts of Meta ads:
 *   /api/r.php?to=calendly&c=f4&m=mail-03
 *
 * Schrijft een PII-vrij `redirect_click` event naar dezelfde marketing eventlog
 * en stuurt daarna door naar een veilige, vooraf bekende bestemming.
 */
declare(strict_types=1);

const TRACK_FILE = '/tmp/ff-marketing-events.jsonl';
const TRACK_FILE_MAX_BYTES = 5242880;

$destinations = [
    'calendly' => 'https://calendly.com/d/cxqh-9ht-kp7/finaforte-masterplan',
    'scan' => 'https://masterplan.finaforte.nl/scan/',
    'rapport' => 'https://masterplan.finaforte.nl/rapport/',
    'masterplan' => 'https://masterplan.finaforte.nl/masterplan/',
    'implementatie' => 'https://masterplan.finaforte.nl/implementatie/',
    'home' => 'https://masterplan.finaforte.nl/',
];

$to = sanitize_token((string)($_GET['to'] ?? 'calendly'), 40);
if (!isset($destinations[$to])) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'unknown-destination']);
    exit;
}

$channel = sanitize_token((string)($_GET['c'] ?? $_GET['channel'] ?? ''), 80);
$message = sanitize_string((string)($_GET['m'] ?? $_GET['message'] ?? ''), 120);
$label = sanitize_string((string)($_GET['label'] ?? ''), 160);

$utm = build_utm($channel, $message);
$target = append_query($destinations[$to], $utm);

$record = [
    'ts' => date('c'),
    'event' => 'redirect_click',
    'path' => sanitize_path((string)($_SERVER['REQUEST_URI'] ?? '/api/r.php')),
    'visitor_id' => null,
    'session_id' => null,
    'referrer_domain' => referrer_domain((string)($_SERVER['HTTP_REFERER'] ?? '')),
    'properties' => array_filter([
        'destination' => $to,
        'channel' => $channel,
        'message' => $message,
        'label' => $label,
        'utm_source' => $utm['utm_source'] ?? '',
        'utm_medium' => $utm['utm_medium'] ?? '',
        'utm_campaign' => $utm['utm_campaign'] ?? '',
        'utm_content' => $utm['utm_content'] ?? '',
        'utm_term' => $utm['utm_term'] ?? '',
    ], static fn($value) => $value !== '' && $value !== null),
];

append_event($record);

header('Cache-Control: no-store, private');
header('X-Robots-Tag: noindex, nofollow');
header('Location: ' . $target, true, 302);
exit;

function build_utm(string $channel, string $message): array {
    $utm = [];
    foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as $key) {
        if (isset($_GET[$key]) && is_scalar($_GET[$key])) {
            $utm[$key] = sanitize_string((string)$_GET[$key], 120);
        }
    }

    if (!isset($utm['utm_source']) && $channel !== '') {
        $utm['utm_source'] = match ($channel) {
            'f4', 'n1', 'c1', 'brevo' => 'brevo',
            'li', 'linkedin' => 'linkedin',
            'fb', 'ig', 'meta' => 'meta',
            default => $channel,
        };
    }
    if (!isset($utm['utm_medium']) && $channel !== '') {
        $utm['utm_medium'] = match ($channel) {
            'f4', 'n1', 'c1', 'brevo' => 'email',
            'li', 'linkedin' => 'organic-social',
            'fb', 'ig', 'meta' => 'paid-social',
            default => 'campaign',
        };
    }
    if (!isset($utm['utm_campaign']) && $channel !== '') {
        $utm['utm_campaign'] = $channel;
    }
    if (!isset($utm['utm_content']) && $message !== '') {
        $utm['utm_content'] = $message;
    }

    return $utm;
}

function append_query(string $url, array $params): string {
    if (!$params) return $url;
    $separator = str_contains($url, '?') ? '&' : '?';
    return $url . $separator . http_build_query($params);
}

function append_event(array $record): void {
    rotate_if_needed(TRACK_FILE);
    $encoded = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($encoded !== false) {
        @file_put_contents(TRACK_FILE, $encoded . PHP_EOL, FILE_APPEND | LOCK_EX);
    }
}

function sanitize_token(string $value, int $maxLen): string {
    $value = strtolower(trim($value));
    $value = preg_replace('/[^a-z0-9_.:-]+/', '-', $value) ?? '';
    return substr(trim($value, '-'), 0, $maxLen);
}

function sanitize_path(string $value): string {
    return sanitize_string($value, 300);
}

function sanitize_string(string $value, int $maxLen): string {
    $value = preg_replace('/[\r\n\t\x00-\x1F]/u', ' ', trim($value)) ?? '';
    $value = preg_replace('/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/i', '[redacted-email]', $value) ?? '';
    return mb_substr($value, 0, $maxLen);
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
