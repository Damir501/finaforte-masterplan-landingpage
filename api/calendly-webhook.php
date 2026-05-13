<?php
/**
 * Calendly → Brevo webhook bridge.
 *
 * Ontvangt POST van Calendly bij `invitee.created` event, verifieert HMAC-signature
 * (Calendly-Webhook-Signature), en doet 2 Brevo API calls:
 *   1. Update contact: tag `call-booked` toevoegen (zorgt dat F3-automation contact
 *      laat exiten, zodat geen overbodige 24u-CTA wordt verstuurd).
 *   2. Send transactional F5-bevestigingsmail met datum/tijd/locatie/reschedule-link.
 *
 * Server-side secrets uit api/.env:
 *   BREVO_API_KEY              — Brevo transactional/contacts API
 *   CALENDLY_WEBHOOK_SECRET    — signing secret van Calendly's webhook
 *
 * Calendly webhook setup:
 *   POST URL: https://masterplan.finaforte.nl/api/calendly-webhook.php
 *   Event:    invitee.created
 *   Secret:   genereer in Calendly, plak in api/.env als CALENDLY_WEBHOOK_SECRET
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

// 1. Method gate
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'method-not-allowed']);
    exit;
}

// 2. Load secrets uit .env
$envPath = __DIR__ . '/.env';
if (!is_readable($envPath)) {
    error_log('[calendly-webhook] .env missing at ' . $envPath);
    http_response_code(500);
    echo json_encode(['error' => 'config-missing']);
    exit;
}
$env = @parse_ini_file($envPath);
$apiKey        = is_array($env) ? ($env['BREVO_API_KEY']           ?? '') : '';
$webhookSecret = is_array($env) ? ($env['CALENDLY_WEBHOOK_SECRET'] ?? '') : '';
if ($apiKey === '' || $webhookSecret === '') {
    error_log('[calendly-webhook] BREVO_API_KEY of CALENDLY_WEBHOOK_SECRET ontbreekt in .env');
    http_response_code(500);
    echo json_encode(['error' => 'config-invalid']);
    exit;
}

// 3. Lees raw body
$raw = file_get_contents('php://input');
if ($raw === false || $raw === '') {
    http_response_code(400);
    echo json_encode(['error' => 'empty-body']);
    exit;
}

// 4. Verifieer Calendly webhook signature
//    Header format: "t=<unix-timestamp>,v1=<hex-hmac-sha256>"
//    HMAC over "<timestamp>.<rawBody>" met het webhook-secret
$sigHeader = $_SERVER['HTTP_CALENDLY_WEBHOOK_SIGNATURE'] ?? '';
if ($sigHeader === '') {
    error_log('[calendly-webhook] signature-header ontbreekt');
    http_response_code(401);
    echo json_encode(['error' => 'missing-signature']);
    exit;
}
$sigParts = [];
foreach (explode(',', $sigHeader) as $part) {
    $kv = explode('=', trim($part), 2);
    if (count($kv) === 2) $sigParts[$kv[0]] = $kv[1];
}
$ts  = $sigParts['t']  ?? '';
$v1  = $sigParts['v1'] ?? '';
if ($ts === '' || $v1 === '' || !ctype_digit($ts)) {
    http_response_code(401);
    echo json_encode(['error' => 'malformed-signature']);
    exit;
}
// Tolerance: reject als > 5 minuten oud (replay-attack guard)
if (abs(time() - (int)$ts) > 300) {
    error_log('[calendly-webhook] timestamp too old: ' . $ts);
    http_response_code(401);
    echo json_encode(['error' => 'stale-signature']);
    exit;
}
$expected = hash_hmac('sha256', $ts . '.' . $raw, $webhookSecret);
if (!hash_equals($expected, $v1)) {
    error_log('[calendly-webhook] signature mismatch');
    http_response_code(401);
    echo json_encode(['error' => 'invalid-signature']);
    exit;
}

// 5. Parse + filter event
$payload = json_decode($raw, true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid-json']);
    exit;
}
$eventType = (string)($payload['event'] ?? '');
if ($eventType !== 'invitee.created') {
    // Geen fout — Calendly stuurt mogelijk ook canceled/rescheduled events; negeer netjes
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

// 6. Extract invitee-data
$email = filter_var($invitee['email'] ?? '', FILTER_VALIDATE_EMAIL);
if (!$email) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid-invitee-email']);
    exit;
}
$email = substr($email, 0, 254);

// Sanitize naam (header-injection guard + length cap)
$fullName = mb_substr(preg_replace('/[\r\n\t\x00-\x1F]/u', '', trim((string)($invitee['name'] ?? ''))) ?? '', 0, 160);
$parts = preg_split('/\s+/', $fullName, 2) ?: [];
$firstName = (string)($parts[0] ?? '');
$lastName  = (string)($parts[1] ?? '');

$event = $invitee['scheduled_event'] ?? [];
$eventName = is_array($event) ? (string)($event['name']       ?? 'Kennismakingsgesprek') : 'Kennismakingsgesprek';
$startIso  = is_array($event) ? (string)($event['start_time'] ?? '') : '';
$endIso    = is_array($event) ? (string)($event['end_time']   ?? '') : '';

$location = (is_array($event) && is_array($event['location'] ?? null)) ? $event['location'] : [];
$locType  = (string)($location['type']     ?? '');
$locJoin  = (string)($location['join_url'] ?? $location['location'] ?? '');

// Sanitize join_url: alleen https-URLs accepteren
$joinUrl = '';
if ($locJoin !== '') {
    $parsedJoin = parse_url($locJoin);
    if (is_array($parsedJoin) && ($parsedJoin['scheme'] ?? '') === 'https') {
        $joinUrl = $locJoin;
    }
}

$rescheduleUrlRaw = (string)($invitee['reschedule_url'] ?? '');
$cancelUrlRaw     = (string)($invitee['cancel_url']     ?? '');
$rescheduleUrl    = '';
$cancelUrl        = '';
foreach (['reschedule_url' => $rescheduleUrlRaw, 'cancel_url' => $cancelUrlRaw] as $k => $u) {
    if ($u === '') continue;
    $p = parse_url($u);
    if (is_array($p)
        && ($p['scheme'] ?? '') === 'https'
        && strtolower($p['host'] ?? '') === 'calendly.com'
    ) {
        if ($k === 'reschedule_url') $rescheduleUrl = $u;
        else                          $cancelUrl     = $u;
    }
}

// 7. Format datum/tijd in NL (Europe/Amsterdam)
$callDate = '';
$callTime = '';
if ($startIso !== '') {
    try {
        $dt = new DateTimeImmutable($startIso);
        $dt = $dt->setTimezone(new DateTimeZone('Europe/Amsterdam'));
        $dayNames = ['', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
        $monNames = ['', 'januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
        $callDate = sprintf('%s %d %s %d', $dayNames[(int)$dt->format('N')], (int)$dt->format('j'), $monNames[(int)$dt->format('n')], (int)$dt->format('Y'));
        $callTime = $dt->format('H:i');
    } catch (Throwable $e) {
        error_log('[calendly-webhook] datetime-parse-error: ' . $e->getMessage());
    }
}

// Locatie-label (mens-leesbaar)
$locationLabel = match ($locType) {
    'google_conference' => 'online via Google Meet',
    'zoom'              => 'online via Zoom',
    'microsoft_teams'   => 'online via Microsoft Teams',
    'physical'          => 'op kantoor',
    'phone', 'inbound_call', 'outbound_call' => 'telefonisch',
    default             => 'volgens Calendly-instelling',
};

// 8. Update Brevo contact — tag `call-booked` + attributes
$brevoAttrs = [
    'FIRSTNAME'     => $firstName,
    'LASTNAME'      => $lastName,
    'CALL_BOOKED'   => 'yes',
    'CALL_DATE'     => $callDate,
    'CALL_TIME'     => $callTime,
    'CALL_LOCATION' => $locationLabel,
];

// Note: Brevo's "tag"-systeem werkt via list-membership OF via een TAGS contact attribute.
// We zetten zowel een attribute CALL_BOOKED=yes (voor filtering) als voegen tag toe.
// Brevo's automation if/then condities kunnen op zowel werken.
$contactPayload = [
    'email'         => $email,
    'attributes'    => $brevoAttrs,
    'updateEnabled' => true,
];
$contactResp = brevo_call('https://api.brevo.com/v3/contacts', 'POST', $contactPayload, $apiKey);

// 9. Send F5 bevestigings-mail (transactional)
$displayName = trim($firstName . ' ' . $lastName);
if ($displayName === '') $displayName = 'daar';

$subject = $callDate !== '' && $callTime !== ''
    ? sprintf('Je kennismaking staat ingepland — %s om %s', $callDate, $callTime)
    : 'Je kennismaking staat ingepland';

$htmlContent = render_f5_html(
    $firstName,
    $callDate,
    $callTime,
    $locationLabel,
    $joinUrl,
    $rescheduleUrl,
    $cancelUrl
);

$emailPayload = [
    'sender'      => ['name' => 'Damir Tvrtkovic | Finaforte', 'email' => 'info@finaforte.nl'],
    'replyTo'     => ['name' => 'Finaforte',                   'email' => 'info@finaforte.nl'],
    'to'          => [['email' => $email, 'name' => $displayName]],
    'subject'     => $subject,
    'htmlContent' => $htmlContent,
    'tags'        => ['call-booked', 'f5-kennismaking-bevestiging'],
];
$emailResp = brevo_call('https://api.brevo.com/v3/smtp/email', 'POST', $emailPayload, $apiKey);

// 10. Resultaat-respons
$ok = ($contactResp['ok'] ?? false) && ($emailResp['ok'] ?? false);
http_response_code($ok ? 200 : 207);
echo json_encode([
    'ok'      => $ok,
    'contact' => $contactResp['status'] ?? null,
    'email'   => $emailResp['status']   ?? null,
]);

// ----------------------------------------------------------------------------

function brevo_call(string $url, string $method, array $body, string $apiKey): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_POSTFIELDS     => json_encode($body, JSON_UNESCAPED_UNICODE),
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Accept: application/json',
            'api-key: ' . $apiKey,
        ],
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_CONNECTTIMEOUT => 3,
    ]);
    $resp = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    if ($resp === false) {
        error_log("[brevo-call] $url curl-fail: $err");
        return ['ok' => false, 'status' => 0, 'error' => $err];
    }
    $ok = ($code >= 200 && $code < 300);
    if (!$ok) {
        $snippet = is_string($resp) ? substr($resp, 0, 500) : '';
        error_log("[brevo-call] $url HTTP $code: $snippet");
    }
    return ['ok' => $ok, 'status' => $code];
}

function render_f5_html(
    string $firstName,
    string $callDate,
    string $callTime,
    string $locationLabel,
    string $joinUrl,
    string $rescheduleUrl,
    string $cancelUrl
): string {
    $hi       = htmlspecialchars($firstName !== '' ? $firstName : 'daar', ENT_QUOTES, 'UTF-8');
    $date     = htmlspecialchars($callDate, ENT_QUOTES, 'UTF-8');
    $time     = htmlspecialchars($callTime, ENT_QUOTES, 'UTF-8');
    $loc      = htmlspecialchars($locationLabel, ENT_QUOTES, 'UTF-8');
    $join     = htmlspecialchars($joinUrl, ENT_QUOTES, 'UTF-8');
    $resched  = htmlspecialchars($rescheduleUrl, ENT_QUOTES, 'UTF-8');
    $cancel   = htmlspecialchars($cancelUrl, ENT_QUOTES, 'UTF-8');

    // Conditionele blokken
    $whenLine = ($date !== '' && $time !== '')
        ? "<strong>$date</strong> om <strong>$time</strong>"
        : 'op het door jou ingeplande moment';

    $locLine = $loc !== ''
        ? "<p style=\"margin:0 0 16px;font-size:15px;line-height:1.55;\">Locatie: <strong>$loc</strong></p>"
        : '';

    $joinBlock = $join !== ''
        ? "<p style=\"margin:0 0 16px;font-size:15px;line-height:1.55;\">Online-link: <a href=\"$join\" style=\"color:#00A2AA;\">$join</a></p>"
        : '';

    $rescheduleBlock = '';
    if ($resched !== '' || $cancel !== '') {
        $resPart = $resched !== '' ? "<a href=\"$resched\" style=\"color:#6a778a;\">Verzetten</a>" : '';
        $canPart = $cancel  !== '' ? "<a href=\"$cancel\"  style=\"color:#6a778a;\">Annuleren</a>" : '';
        $sep     = ($resPart !== '' && $canPart !== '') ? ' &middot; ' : '';
        $rescheduleBlock = "<p style=\"margin:0 0 0;font-size:12px;line-height:1.5;color:#6a778a;\">$resPart$sep$canPart</p>";
    }

    return <<<HTML
<!doctype html>
<html lang="nl">
<head><meta charset="UTF-8"><title>Kennismaking bevestigd</title></head>
<body style="margin:0;padding:24px;background:#f5f6f8;font-family:Helvetica,Arial,sans-serif;color:#1a2738;">
  <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e6e8ec;">
    <tr><td style="background:#00A2AA;height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
    <tr><td style="padding:32px;">
      <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a2738;line-height:1.3;">
        Je kennismaking staat ingepland
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">Hi $hi,</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">
        Bedankt — je kennismakingsgesprek staat in mijn agenda voor $whenLine.
      </p>
      $locLine
      $joinBlock
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">
        Op basis van je scan kijken we samen naar de drie onderwerpen waar in jouw situatie waarschijnlijk iets in beweging komt. Geen verkoopgesprek, geen verplichting.
      </p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">
        Drie vragen om alvast over na te denken (geen huiswerk &mdash; alles wat je 30 sec overdenkt, maakt het gesprek scherper):
      </p>
      <ol style="margin:0 0 24px;padding-left:20px;font-size:15px;line-height:1.55;">
        <li style="margin-bottom:6px;">Wat zou voor jou een geslaagd gesprek zijn?</li>
        <li style="margin-bottom:6px;">Welke beslissing speelt nu &mdash; of komend half jaar?</li>
        <li>Is er een collega-adviseur die we mee moeten nemen?</li>
      </ol>
      <p style="margin:0 0 4px;font-size:15px;line-height:1.55;">Tot dan,</p>
      <p style="margin:0;font-size:15px;line-height:1.55;">
        Damir Tvrtkovic<br>Finaforte<br><a href="mailto:info@finaforte.nl" style="color:#00A2AA;">info@finaforte.nl</a>
      </p>
    </td></tr>
    <tr><td style="background:#f5f6f8;padding:16px 32px;font-size:12px;line-height:1.5;color:#6a778a;">
      Je ontvangt deze e-mail omdat je een kennismakingsgesprek hebt ingepland via <a href="https://masterplan.finaforte.nl/" style="color:#00A2AA;">masterplan.finaforte.nl</a>.
      $rescheduleBlock
    </td></tr>
  </table>
</body>
</html>
HTML;
}
