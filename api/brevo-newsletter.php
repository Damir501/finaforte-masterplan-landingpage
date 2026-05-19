<?php
/**
 * Brevo newsletter-aanmelding proxy.
 *
 * Ontvangt JSON payload van het Onderhoudsronde-form op de homepage, maakt het
 * contact aan in Brevo list `newsletter-onderhoudsronde` (id 36) en stuurt een
 * welkom-bevestigingsmail naar de inschrijver.
 *
 * Server-side API-key load uit api/.env (zelfde patroon als brevo-scan-completion.php).
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

// 2. Load API key uit .env
$envPath = __DIR__ . '/.env';
if (!is_readable($envPath)) {
    error_log('[brevo-newsletter] .env missing at ' . $envPath);
    http_response_code(500);
    echo json_encode(['error' => 'config-missing']);
    exit;
}
$env = @parse_ini_file($envPath);
$apiKey = is_array($env) ? ($env['BREVO_API_KEY'] ?? '') : '';
if ($apiKey === '') {
    error_log('[brevo-newsletter] BREVO_API_KEY leeg of .env onleesbaar');
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
$email = substr($email, 0, 254);

// Honeypot: silently 200 — bot denkt success, geen Brevo-call
$honey = trim((string)($payload['honey'] ?? ''));
if ($honey !== '') {
    http_response_code(202);
    echo json_encode(['ok' => true, 'status' => 'ignored']);
    exit;
}

$source = mb_substr(preg_replace('/[\r\n\t\x00-\x1F]/u', '', trim((string)($payload['source'] ?? 'home/newsletter'))) ?? '', 0, 80);

// 4. Brevo contact aanmaken in list 36 (idempotent)
$contactPayload = [
    'email'         => $email,
    'attributes'    => [
        'NEWSLETTER_SOURCE' => $source,
        'OPT_IN_DATE'       => date('Y-m-d H:i:s'),
    ],
    'listIds'       => [36], // newsletter-onderhoudsronde
    'updateEnabled' => true,
];
$contactResp = brevo_call('https://api.brevo.com/v3/contacts', 'POST', $contactPayload, $apiKey);

// 5. Welkom-bevestigingsmail (transactional)
$emailPayload = [
    'sender'      => ['name' => 'Damir Tvrtkovic | Finaforte', 'email' => 'info@finaforte.nl'],
    'replyTo'     => ['name' => 'Finaforte',                  'email' => 'info@finaforte.nl'],
    'to'          => [['email' => $email, 'name' => $email]],
    'subject'     => 'Welkom bij de Onderhoudsronde',
    'htmlContent' => render_welcome_html(),
    'tags'        => ['newsletter-welkom', 'onderhoudsronde'],
];
$emailResp = brevo_call('https://api.brevo.com/v3/smtp/email', 'POST', $emailPayload, $apiKey);

// 6. Resultaat (fail-soft)
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
        error_log("[brevo-newsletter] $url curl-fail: $err");
        return ['ok' => false, 'status' => 0, 'error' => $err];
    }
    $ok = ($code >= 200 && $code < 300);
    if (!$ok) {
        $snippet = is_string($resp) ? substr($resp, 0, 500) : '';
        error_log("[brevo-newsletter] $url HTTP $code: $snippet");
    }
    return ['ok' => $ok, 'status' => $code];
}

function render_welcome_html(): string {
    return <<<HTML
<!doctype html>
<html lang="nl">
<head><meta charset="UTF-8"><title>Welkom bij de Onderhoudsronde</title></head>
<body style="margin:0;padding:24px;background:#f5f6f8;font-family:Helvetica,Arial,sans-serif;color:#1a2738;">
  <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e6e8ec;">
    <tr><td style="background:#00A2AA;height:6px;line-height:6px;font-size:0;">&nbsp;</td></tr>
    <tr><td style="padding:32px;">
      <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#1a2738;line-height:1.25;">
        Welkom bij de Onderhoudsronde
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">
        Bedankt — uw aanmelding is binnen. Vier keer per jaar ontvangt u een rustige update: relevante wetswijzigingen, een korte casus, en een check-vraag die u zichzelf of uw adviseur kunt stellen.
      </p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">
        Geen verkooppraat, geen spam. U kunt zich altijd weer afmelden onderaan elke editie.
      </p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">
        Tot de eerstvolgende editie,
      </p>
      <p style="margin:0;font-size:15px;line-height:1.55;">
        Damir Tvrtkovic<br>Finaforte<br><a href="mailto:info@finaforte.nl" style="color:#00A2AA;">info@finaforte.nl</a>
      </p>
    </td></tr>
    <tr><td style="background:#f5f6f8;padding:16px 32px;font-size:12px;line-height:1.5;color:#6a778a;">
      U ontvangt deze e-mail omdat u zich heeft aangemeld voor de Onderhoudsronde via <a href="https://masterplan.finaforte.nl/" style="color:#00A2AA;">masterplan.finaforte.nl</a>. Afmelden kan onderaan elke editie.
    </td></tr>
  </table>
</body>
</html>
HTML;
}
