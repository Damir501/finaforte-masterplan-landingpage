<?php
/**
 * Brevo scan-completion proxy.
 *
 * Ontvangt JSON payload van scan-submit.js (Funnel Fase A), maakt het contact aan in
 * Brevo list `scan-leads-2026` (id 32), en stuurt de rapport-bezorgings-mail.
 *
 * Server-side API-key load uit api/.env (zie .env.example). De .env zit NOOIT in repo
 * (zie .gitignore: `.env`), Damir uploadt 'm via cPanel File Manager.
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

// 2. Load API key uit .env (parse_ini_file)
$envPath = __DIR__ . '/.env';
if (!is_readable($envPath)) {
    error_log('[brevo-scan-completion] .env missing at ' . $envPath);
    http_response_code(500);
    echo json_encode(['error' => 'config-missing']);
    exit;
}
$env = @parse_ini_file($envPath);
$apiKey = is_array($env) ? ($env['BREVO_API_KEY'] ?? '') : '';
if ($apiKey === '') {
    error_log('[brevo-scan-completion] BREVO_API_KEY leeg of .env onleesbaar');
    http_response_code(500);
    echo json_encode(['error' => 'config-invalid']);
    exit;
}

// 3. Parse + valideer JSON payload
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

$email = filter_var($payload['email'] ?? '', FILTER_VALIDATE_EMAIL);
if (!$email) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid-email']);
    exit;
}
$email = substr($email, 0, 254); // RFC 5321

// Sanitize firstName/lastName: strip control chars (header-injection guard) + length cap
$firstName  = mb_substr(preg_replace('/[\r\n\t\x00-\x1F]/u', '', trim((string)($payload['firstName'] ?? ''))) ?? '', 0, 80);
$lastName   = mb_substr(preg_replace('/[\r\n\t\x00-\x1F]/u', '', trim((string)($payload['lastName']  ?? ''))) ?? '', 0, 80);
$tags       = is_array($payload['tags']       ?? null) ? $payload['tags']       : [];
$attributes = is_array($payload['attributes'] ?? null) ? $payload['attributes'] : [];

// Hardened RAPPORT_URL: alleen https://masterplan.finaforte.nl/* (anti-phishing-injectie)
$rapportUrlRaw = (string)($attributes['RAPPORT_URL'] ?? '');
$parsed = parse_url($rapportUrlRaw);
$allowedHost = 'masterplan.finaforte.nl';
$rapportUrl = 'https://masterplan.finaforte.nl/';
if (is_array($parsed)
    && ($parsed['scheme'] ?? '') === 'https'
    && strtolower($parsed['host'] ?? '') === $allowedHost
) {
    $rapportUrl = $rapportUrlRaw;
}

// 4. Bouw Brevo contact-attrs (alleen scalaire waarden)
$brevoAttrs = [
    'FIRSTNAME' => $firstName,
    'LASTNAME'  => $lastName,
    'SCAN_TAGS' => implode(',', array_filter($tags, 'is_string')),
];
foreach ($attributes as $k => $v) {
    if (is_scalar($v) || $v === null) {
        $brevoAttrs[strtoupper((string)$k)] = $v;
    }
}

// 5. POST /v3/contacts (idempotent: updateEnabled=true)
$contactPayload = [
    'email'          => $email,
    'attributes'     => $brevoAttrs,
    'listIds'        => [32], // scan-leads-2026
    'updateEnabled'  => true,
];
$contactResp = brevo_call('https://api.brevo.com/v3/contacts', 'POST', $contactPayload, $apiKey);

// 6. POST /v3/smtp/email (transactional rapport-bezorging)
$displayName = trim($firstName . ' ' . $lastName);
if ($displayName === '') $displayName = 'Bezoeker';

$subject = ($firstName !== '')
    ? sprintf('%s, je blinde-vlekken-rapport staat klaar', $firstName)
    : 'Je blinde-vlekken-rapport staat klaar';

$htmlContent = render_email_html($firstName, $rapportUrl);

$emailPayload = [
    'sender'      => ['name' => 'Damir Babacic | Finaforte', 'email' => 'info@finaforte.nl'],
    'replyTo'     => ['name' => 'Finaforte',                 'email' => 'info@finaforte.nl'],
    'to'          => [['email' => $email, 'name' => $displayName]],
    'subject'     => $subject,
    'htmlContent' => $htmlContent,
    'tags'        => array_values(array_filter($tags, 'is_string')),
];
$emailResp = brevo_call('https://api.brevo.com/v3/smtp/email', 'POST', $emailPayload, $apiKey);

// 7. Resultaat-respons (fail-soft — frontend doet redirect ongeacht)
$ok = ($contactResp['ok'] ?? false) && ($emailResp['ok'] ?? false);
http_response_code($ok ? 202 : 207);
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

function render_email_html(string $firstName, string $rapportUrl): string {
    $hi  = htmlspecialchars($firstName !== '' ? $firstName : 'daar', ENT_QUOTES, 'UTF-8');
    $url = htmlspecialchars($rapportUrl, ENT_QUOTES, 'UTF-8');
    return <<<HTML
<!doctype html>
<html lang="nl">
<head><meta charset="UTF-8"><title>Je blinde-vlekken-rapport</title></head>
<body style="margin:0;padding:24px;background:#f5f6f8;font-family:Helvetica,Arial,sans-serif;color:#1a2738;">
  <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e6e8ec;">
    <tr><td style="background:#00A2AA;height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
    <tr><td style="padding:32px;">
      <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#1a2738;line-height:1.25;">
        Je blinde-vlekken-rapport staat klaar
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">Hi {$hi},</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">
        Bedankt — je antwoorden zijn binnen. Op basis daarvan hebben we direct je persoonlijke rapport opgemaakt. Het opent in je browser; je kunt het meteen lezen, opslaan of later teruglezen via de link in deze mail.
      </p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.55;">
        In het rapport zie je per onderwerp waar je situatie stevig staat, waar er waarschijnlijk een blinde vlek zit, en welke vraag je jezelf — of je adviseur — kunt stellen om verder te kijken. Het is een eerste signalering, geen advies.
      </p>
      <p style="margin:0 0 32px;text-align:center;">
        <a href="{$url}" style="display:inline-block;background:#00A2AA;color:#ffffff;text-decoration:none;padding:14px 28px;font-size:15px;font-weight:600;border-radius:4px;font-family:Helvetica,Arial,sans-serif;">Open mijn rapport</a>
      </p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">
        Wil je je situatie samen met ons doornemen? Plan een vrijblijvend kennismakingsgesprek van 30 minuten. Geen verkoopgesprek, geen verplichting — we kijken samen of een Masterplan voor jouw situatie zinvol is.
      </p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.55;">
        <a href="https://masterplan.finaforte.nl/#kennismaking" style="color:#00A2AA;">Plan een kennismakingsgesprek &rarr;</a>
      </p>
      <p style="margin:0 0 4px;font-size:15px;line-height:1.55;">Tot zo,</p>
      <p style="margin:0;font-size:15px;line-height:1.55;">
        Damir Babacic<br>Finaforte<br><a href="mailto:info@finaforte.nl" style="color:#00A2AA;">info@finaforte.nl</a>
      </p>
    </td></tr>
    <tr><td style="background:#f5f6f8;padding:16px 32px;font-size:12px;line-height:1.5;color:#6a778a;">
      Je ontvangt deze e-mail omdat je de Blinde-Vlekken-Scan hebt ingevuld op <a href="https://masterplan.finaforte.nl/" style="color:#00A2AA;">masterplan.finaforte.nl</a>. Dit rapport is een vrijblijvende eerste signalering, geen advies. Tarieven en regelgeving: stand mei 2026.
    </td></tr>
  </table>
</body>
</html>
HTML;
}
