<?php
/**
 * B1 No-show-preventie cron — verstuurt B1-reminder ~24u vóór elke
 * geplande kennismaking.
 *
 * Werking:
 *   1. Itereert alle contacts in Brevo-list 32 (scan-leads-2026).
 *   2. Filtert contacts waar CALL_TIMESTAMP binnen 23h30m..24h30m vanaf nu valt.
 *   3. Slaat over als B1_SENT al gevuld is (idempotency).
 *   4. Verstuurt Brevo transactional template #119 (B1-no-show-preventie-24u)
 *      met params CALL_TIME, CALL_FORMAT, CALL_LOCATION_BLOCK.
 *   5. Zet B1_SENT op contact bij success (ISO 8601 timestamp).
 *
 * Cron-config (cPanel → Cron Jobs):
 *   Schedule:  *\/30 * * * *  (elke 30 min)
 *   Command:   /usr/local/bin/php /home/<user>/public_html/api/b1-reminder-cron.php
 *
 * Server-side secret uit api/.env:
 *   BREVO_API_KEY    — Brevo transactional/contacts API
 *
 * Re-entry na reschedule: calendly-webhook.php reset B1_SENT bij elke
 * invitee.created (ook bij reschedule, Calendly stuurt dan nieuwe created event).
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("CLI only.\n");
}

// 1. Load .env
$envPath = __DIR__ . '/.env';
if (!is_readable($envPath)) {
    error_log('[b1-cron] .env missing');
    exit(2);
}
$env    = @parse_ini_file($envPath);
$apiKey = is_array($env) ? ($env['BREVO_API_KEY'] ?? '') : '';
if ($apiKey === '') {
    error_log('[b1-cron] BREVO_API_KEY missing');
    exit(3);
}

// 2. Window: 23.5–24.5 uur vanaf nu (UTC)
$now      = new DateTimeImmutable('now', new DateTimeZone('UTC'));
$loWindow = $now->modify('+23 hours +30 minutes');
$hiWindow = $now->modify('+24 hours +30 minutes');

$listId   = 32;
$tmplId   = 119;
$pageSize = 500;
$offset   = 0;
$loops    = 0;
$maxLoops = 20; // safety cap (=10k contacts)

$sent = 0; $skipped = 0; $errors = 0; $scanned = 0;

while ($loops++ < $maxLoops) {
    $url  = "https://api.brevo.com/v3/contacts/lists/{$listId}/contacts?limit={$pageSize}&offset={$offset}&sort=desc";
    $resp = brevo_get($url, $apiKey);
    if (!$resp['ok']) {
        error_log('[b1-cron] list fetch failed http=' . $resp['status']);
        break;
    }
    $contacts = $resp['data']['contacts'] ?? [];
    if (count($contacts) === 0) break;

    foreach ($contacts as $c) {
        $scanned++;
        $email = (string)($c['email'] ?? '');
        if ($email === '') { $skipped++; continue; }

        $attrs    = $c['attributes'] ?? [];
        $ctsStr   = (string)($attrs['CALL_TIMESTAMP'] ?? '');
        $b1Marker = (string)($attrs['B1_SENT']        ?? '');
        if ($ctsStr === '' || $b1Marker !== '') { $skipped++; continue; }

        try {
            $cts = new DateTimeImmutable($ctsStr);
        } catch (Throwable $e) {
            error_log("[b1-cron] bad timestamp for {$email}: {$ctsStr}");
            $errors++; continue;
        }

        if ($cts < $loWindow || $cts > $hiWindow) { $skipped++; continue; }

        // Build template params
        $callTime  = (string)($attrs['CALL_TIME']     ?? $cts->setTimezone(new DateTimeZone('Europe/Amsterdam'))->format('H:i'));
        $callLoc   = (string)($attrs['CALL_LOCATION'] ?? 'volgens Calendly-instelling');
        $joinUrl   = (string)($attrs['CALL_JOIN_URL'] ?? '');
        $callFmt   = $callLoc;

        $locBlock  = 'Locatie: <strong>' . htmlspecialchars($callLoc, ENT_QUOTES, 'UTF-8') . '</strong>';
        if ($joinUrl !== '' && filter_var($joinUrl, FILTER_VALIDATE_URL) && str_starts_with($joinUrl, 'https://')) {
            $locBlock .= '<br>Online-link: <a href="' . htmlspecialchars($joinUrl, ENT_QUOTES, 'UTF-8') . '" style="color:#00A2AA;">deelnemen</a>';
        }

        $sendResp = brevo_post('https://api.brevo.com/v3/smtp/email', [
            'to'         => [['email' => $email]],
            'templateId' => $tmplId,
            'params'     => [
                'CALL_TIME'           => $callTime,
                'CALL_FORMAT'         => $callFmt,
                'CALL_LOCATION_BLOCK' => $locBlock,
            ],
            'tags'       => ['b1-reminder'],
        ], $apiKey);

        if (!$sendResp['ok']) {
            error_log("[b1-cron] send failed for {$email} http=" . $sendResp['status']);
            $errors++; continue;
        }

        // Mark B1_SENT op contact
        $markResp = brevo_post('https://api.brevo.com/v3/contacts', [
            'email'         => $email,
            'attributes'    => ['B1_SENT' => $now->format(DATE_ATOM)],
            'updateEnabled' => true,
        ], $apiKey);
        if (!$markResp['ok']) {
            error_log("[b1-cron] B1_SENT update failed for {$email} http=" . $markResp['status']);
            // Email is wel verstuurd — niet als error rekenen, gewoon loggen
        }

        $sent++;
    }

    if (count($contacts) < $pageSize) break;
    $offset += $pageSize;
}

$summary = sprintf(
    '[b1-cron] %s sent=%d skipped=%d errors=%d scanned=%d window=%s..%s',
    $now->format('Y-m-d H:i:s\Z'),
    $sent, $skipped, $errors, $scanned,
    $loWindow->format('H:i'),
    $hiWindow->format('H:i')
);
error_log($summary);
echo $summary . "\n";
exit($errors > 0 ? 1 : 0);

// ----------------------------------------------------------------------------

function brevo_get(string $url, string $apiKey): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Accept: application/json',
            'api-key: ' . $apiKey,
        ],
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_CONNECTTIMEOUT => 5,
    ]);
    $resp = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($resp === false) return ['ok' => false, 'status' => 0, 'data' => null];
    $ok = ($code >= 200 && $code < 300);
    $data = json_decode((string)$resp, true);
    return ['ok' => $ok, 'status' => $code, 'data' => is_array($data) ? $data : null];
}

function brevo_post(string $url, array $body, string $apiKey): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => 'POST',
        CURLOPT_POSTFIELDS     => json_encode($body, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Accept: application/json',
            'api-key: ' . $apiKey,
        ],
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_CONNECTTIMEOUT => 3,
    ]);
    $resp = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($resp === false) return ['ok' => false, 'status' => 0];
    return ['ok' => ($code >= 200 && $code < 300), 'status' => $code];
}
