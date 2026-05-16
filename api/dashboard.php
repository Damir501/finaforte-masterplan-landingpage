<?php
/**
 * Dashboard proxy — backend voor masterplan.finaforte.nl/dashboard/
 *
 * Aggregeert metrics uit Brevo + Calendly tot één JSON-respons voor de cockpit.
 * Spec: Masterplan Landingpage v2/dashboard/specs/2026-05-16-dashboard-v0.md
 *
 * Zes metrics in V0:
 *   M1 — Scans deze week (Brevo lijst 32)
 *   M2 — Calls geboekt deze week (Calendly)              [stub tot CALENDLY_API_TOKEN]
 *   M3 — Scan→Call conversie 30d                          [stub tot Calendly live]
 *   M4 — F4 gem. open-rate 30d (templates #101-107)
 *   M5 — Top 3 calcs 30d (UTM-aggregatie)
 *   M6 — Rode lamp (bounces, unsubs, spam)
 *
 * Server-side creds: api/.env (BREVO_API_KEY, CALENDLY_API_TOKEN, DASHBOARD_AUTH_EMAILS).
 * .env NOOIT in Git, Damir zet via cPanel File Manager.
 *
 * Cache: 10 min TTL in /tmp/dashboard-cache.json, bypass via ?refresh=1.
 */
declare(strict_types=1);

// ---------- 1. Headers + method gate ----------
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: private, no-store');

// CORS: laat eigen dashboard + Cowork-artifacts (Anthropic-hosted) toe.
// Endpoint is GET-only en retourneert alleen aggregate data (geen PII),
// dus de iets opener policy is acceptabel.
$ALLOWED_ORIGINS = [
    'https://masterplan.finaforte.nl',     // eigen dashboard
    'https://claude.ai',                   // Cowork web
    'https://desktop.anthropic.com',       // Cowork desktop (mogelijk)
    'https://artifact.claude.com',         // Cowork artifact iframe (mogelijk)
];
$reqOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($reqOrigin, $ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $reqOrigin);
} elseif ($reqOrigin !== '' && preg_match('#^https://[a-z0-9-]+\.(claude\.com|anthropic\.com|claude\.ai)$#', $reqOrigin)) {
    // Subdomain-wildcard voor Anthropic/Claude infra
    header('Access-Control-Allow-Origin: ' . $reqOrigin);
} else {
    // Fallback: eigen dashboard (browsers zonder Origin-header)
    header('Access-Control-Allow-Origin: https://masterplan.finaforte.nl');
}
header('Vary: Origin');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Accept, Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'method-not-allowed']);
    exit;
}

// ---------- 2. Config ----------
const LIST_ID_SCANS        = 32;          // scan-leads-2026
const F4_TEMPLATE_IDS      = [101, 102, 103, 104, 105, 106, 107];
const CACHE_TTL_SECONDS    = 600;          // 10 min
const CACHE_FILE           = '/tmp/dashboard-cache.json';
const LOG_PREFIX           = '[dashboard] ';
const CALENDLY_USER_HINT   = 'damir';      // wordt gebruikt om event-owner te matchen

// Drempelwaarden (uit spec §3)
const THRESHOLD_SCANS_RED        = 3;
const THRESHOLD_SCANS_GREEN      = 7;
const THRESHOLD_CALLS_RED        = 1;
const THRESHOLD_CALLS_GREEN      = 2;
const THRESHOLD_CONV_RED_PCT     = 8.0;
const THRESHOLD_CONV_GREEN_PCT   = 15.0;
const THRESHOLD_F4_RED_PCT       = 25.0;
const THRESHOLD_F4_GREEN_PCT     = 35.0;
const THRESHOLD_BOUNCES_RED      = 2;      // per week
const THRESHOLD_UNSUB_RED_PCT    = 2.0;

// Calc-naam-mapping (UTM_CONTENT → leesbare naam) — uit Mini-Calculators-tree
const CALC_NAMES = [
    '01' => 'Salaris vs Dividend',
    '02' => 'BTW-suppletie',
    '03' => 'DGA-loon optimaal',
    '04' => 'Investeringsaftrek',
    '05' => 'Auto van de zaak',
    '06' => 'Pensioen DGA',
    '07' => 'Holding-structuur',
    '08' => 'Lijfrente-aftrek',
    '09' => 'Hypotheek-rente',
    '10' => 'Schenkbelasting',
    '11' => 'Pensioengat',
    '12' => 'Eigen-woning-reserve',
    '13' => 'Box3-2028 impact',
];

// ---------- 3. Load .env ----------
$envPath = __DIR__ . '/.env';
if (!is_readable($envPath)) {
    error_log(LOG_PREFIX . '.env missing at ' . $envPath);
    http_response_code(500);
    echo json_encode(['error' => 'config-missing']);
    exit;
}
$env = @parse_ini_file($envPath);
if (!is_array($env)) {
    error_log(LOG_PREFIX . '.env unreadable');
    http_response_code(500);
    echo json_encode(['error' => 'config-invalid']);
    exit;
}
$brevoKey       = (string)($env['BREVO_API_KEY']      ?? '');
$calendlyToken  = (string)($env['CALENDLY_API_TOKEN'] ?? '');

if ($brevoKey === '') {
    error_log(LOG_PREFIX . 'BREVO_API_KEY missing');
    http_response_code(500);
    echo json_encode(['error' => 'brevo-key-missing']);
    exit;
}

// ---------- 4. Cache check ----------
$forceRefresh = isset($_GET['refresh']) && $_GET['refresh'] === '1';

if (!$forceRefresh && is_readable(CACHE_FILE)) {
    $stat = @stat(CACHE_FILE);
    $age  = $stat ? (time() - (int)$stat['mtime']) : PHP_INT_MAX;
    if ($age < CACHE_TTL_SECONDS) {
        $cached = @file_get_contents(CACHE_FILE);
        if ($cached !== false) {
            $data = @json_decode($cached, true);
            if (is_array($data)) {
                $data['cache_age_seconds'] = $age;
                http_response_code(200);
                echo json_encode($data);
                exit;
            }
        }
    }
}

// ---------- 5. Fetch alle metrics ----------
$errors  = [];
$metrics = [];

$nowTs        = time();
$weekAgoTs    = $nowTs - (7 * 86400);
$twoWeekAgoTs = $nowTs - (14 * 86400);
$month30Ts    = $nowTs - (30 * 86400);
$fourWeekTs   = $nowTs - (28 * 86400);

// M1 — Scans deze week (+ vorige week + 4w-gemiddelde)
try {
    $scansThis = brevo_count_contacts_in_list_since($brevoKey, LIST_ID_SCANS, $weekAgoTs, $nowTs);
    $scansPrev = brevo_count_contacts_in_list_since($brevoKey, LIST_ID_SCANS, $twoWeekAgoTs, $weekAgoTs);
    $scans4w   = brevo_count_contacts_in_list_since($brevoKey, LIST_ID_SCANS, $fourWeekTs, $nowTs);
    $avg4w     = round($scans4w / 4, 1);
    $deltaPct  = compute_delta_pct($scansThis, $scansPrev);
    $metrics['scans_week'] = [
        'value'     => $scansThis,
        'delta_pct' => $deltaPct,
        'avg_4w'    => $avg4w,
        'status'    => classify_scans($scansThis),
    ];
} catch (Throwable $e) {
    $errors[] = ['source' => 'brevo-scans', 'message' => $e->getMessage()];
    $metrics['scans_week'] = null;
}

// M2 — Calls deze week (Calendly) — stub indien token ontbreekt
if ($calendlyToken === '') {
    $errors[] = ['source' => 'calendly', 'message' => 'CALENDLY_API_TOKEN not configured'];
    $metrics['calls_week'] = null;
    $metrics['conversion_30d'] = null;
} else {
    try {
        $callsThis = calendly_count_events_since($calendlyToken, $weekAgoTs, $nowTs);
        $callsPrev = calendly_count_events_since($calendlyToken, $twoWeekAgoTs, $weekAgoTs);
        $calls4w   = calendly_count_events_since($calendlyToken, $fourWeekTs, $nowTs);
        $avg4wCall = round($calls4w / 4, 1);
        $metrics['calls_week'] = [
            'value'     => $callsThis,
            'delta_pct' => compute_delta_pct($callsThis, $callsPrev),
            'avg_4w'    => $avg4wCall,
            'status'    => classify_calls($callsThis),
        ];

        // M3 — Conversion 30d
        $scans30d = brevo_count_contacts_in_list_since($brevoKey, LIST_ID_SCANS, $month30Ts, $nowTs);
        $calls30d = calendly_count_events_since($calendlyToken, $month30Ts, $nowTs);
        $convPct  = ($scans30d > 0) ? round(($calls30d / $scans30d) * 100, 1) : null;
        $metrics['conversion_30d'] = [
            'value_pct'  => $convPct,
            'scans_30d'  => $scans30d,
            'calls_30d'  => $calls30d,
            'status'     => $convPct === null ? 'unknown' : classify_conversion($convPct),
        ];
    } catch (Throwable $e) {
        $errors[] = ['source' => 'calendly', 'message' => $e->getMessage()];
        $metrics['calls_week'] = null;
        $metrics['conversion_30d'] = null;
    }
}

// M4 — F4 gem. open-rate 30d (per-template breakdown)
try {
    $perTemplate = [];
    $opensSum    = 0.0;
    $weightSum   = 0;
    $templateErrors = 0;
    $eventCountSum = 0;
    foreach (F4_TEMPLATE_IDS as $tplId) {
        try {
            $stats = brevo_template_stats($brevoKey, $tplId, $month30Ts, $nowTs);
        } catch (Throwable $e) {
            $templateErrors++;
            error_log(LOG_PREFIX . 'F4 template #' . $tplId . ' stats failed: ' . $e->getMessage());
            $stats = [
                'sent' => 0,
                'delivered' => 0,
                'opens' => 0,
                'clicks' => 0,
                'hardBounces' => 0,
                'softBounces' => 0,
                'unsubscribed' => 0,
                'complaints' => 0,
                'event_count' => 0,
                'source' => 'events-unavailable',
            ];
        }
        $sent  = (int)($stats['sent']    ?? 0);
        $opens = (int)($stats['opens']   ?? 0);
        $eventCount = (int)($stats['event_count'] ?? 0);
        $eventCountSum += $eventCount;
        $openPct = ($sent > 0) ? round(($opens / $sent) * 100, 1) : null;
        $perTemplate[] = [
            'id'        => $tplId,
            'name'      => 'F4-mail' . (array_search($tplId, F4_TEMPLATE_IDS, true) + 1),
            'sent'      => $sent,
            'open_pct'  => $openPct,
            'event_count' => $eventCount,
            'source'    => (string)($stats['source'] ?? 'events'),
        ];
        if ($sent > 0) {
            $opensSum  += $opens;
            $weightSum += $sent;
        }
    }
    if ($templateErrors === count(F4_TEMPLATE_IDS)) {
        throw new RuntimeException('Brevo F4 event stats unavailable');
    }

    $note = null;
    if ($eventCountSum === 0 && $templateErrors === 0) {
        $note = 'Brevo geeft voor deze automation-mails geen per-template events via de API. Bekijk F4-breakdown voorlopig in Brevo Automation #13.';
        $perTemplate = [];
        foreach (F4_TEMPLATE_IDS as $tplId) {
            $perTemplate[] = [
                'id'          => $tplId,
                'name'        => 'F4-mail' . (array_search($tplId, F4_TEMPLATE_IDS, true) + 1),
                'sent'        => null,
                'open_pct'    => null,
                'event_count' => 0,
                'source'      => 'automation-events-empty',
            ];
        }
    }

    $avgOpenPct = ($weightSum > 0) ? round(($opensSum / $weightSum) * 100, 1) : null;
    $metrics['f4_engagement_30d'] = [
        'avg_open_rate_pct' => $avgOpenPct,
        'per_template'      => $perTemplate,
        'status'            => $avgOpenPct === null ? 'unknown' : classify_f4($avgOpenPct),
        'note'              => $note,
    ];
} catch (Throwable $e) {
    $errors[] = ['source' => 'brevo-f4-stats', 'message' => $e->getMessage()];
    $metrics['f4_engagement_30d'] = null;
}

// M5 — Top 3 calcs 30d (UTM-aggregatie uit lijst 32)
try {
    $contacts = brevo_fetch_list_contacts_since($brevoKey, LIST_ID_SCANS, $month30Ts, $nowTs);
    $tally = [];
    foreach ($contacts as $c) {
        $attr   = is_array($c['attributes'] ?? null) ? $c['attributes'] : [];
        $source = strtolower((string)($attr['UTM_SOURCE'] ?? ''));
        if ($source !== 'calc') continue;
        $content = str_pad((string)($attr['UTM_CONTENT'] ?? ''), 2, '0', STR_PAD_LEFT);
        if ($content === '00' || $content === '') continue;
        $tally[$content] = ($tally[$content] ?? 0) + 1;
    }
    arsort($tally);
    $top3 = [];
    $rank = 0;
    foreach ($tally as $utmContent => $leads) {
        $top3[] = [
            'utm_content' => $utmContent,
            'calc_name'   => CALC_NAMES[$utmContent] ?? ('Calc ' . $utmContent),
            'leads'       => $leads,
        ];
        if (++$rank >= 3) break;
    }
    $metrics['top_calcs_30d'] = $top3;
} catch (Throwable $e) {
    $errors[] = ['source' => 'brevo-top-calcs', 'message' => $e->getMessage()];
    $metrics['top_calcs_30d'] = null;
}

// M6 — Rode lamp (bounces, unsubs, spam 7d)
try {
    $health = brevo_aggregated_health($brevoKey, $weekAgoTs, $nowTs);
    $issues = [];
    if ((int)$health['hardBounces'] > THRESHOLD_BOUNCES_RED) {
        $issues[] = sprintf('%d hard-bounces (drempel >%d)', (int)$health['hardBounces'], THRESHOLD_BOUNCES_RED);
    }
    if ((int)$health['complaints'] > 0) {
        $issues[] = sprintf('%d spam-klacht(en)', (int)$health['complaints']);
    }
    $unsubPct = ($health['delivered'] > 0)
        ? round(($health['unsubscribed'] / $health['delivered']) * 100, 2)
        : 0.0;
    if ($unsubPct > THRESHOLD_UNSUB_RED_PCT) {
        $issues[] = sprintf('Unsub-rate %.2f%% (drempel >%.1f%%)', $unsubPct, THRESHOLD_UNSUB_RED_PCT);
    }
    $metrics['red_lamp'] = [
        'status'         => empty($issues) ? 'green' : 'red',
        'issues'         => $issues,
        'hard_bounces'   => (int)$health['hardBounces'],
        'soft_bounces'   => (int)$health['softBounces'],
        'unsubscribed'   => (int)$health['unsubscribed'],
        'delivered'      => (int)$health['delivered'],
        'unsub_rate_pct' => $unsubPct,
    ];
} catch (Throwable $e) {
    $errors[] = ['source' => 'brevo-health', 'message' => $e->getMessage()];
    $metrics['red_lamp'] = null;
}

// ---------- 6. Assemble + write cache ----------
$response = [
    'generated_at'      => date('c'),
    'cache_age_seconds' => 0,
    'errors'            => $errors,
    'metrics'           => $metrics,
];

$encoded = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($encoded !== false) {
    @file_put_contents(CACHE_FILE, $encoded, LOCK_EX);
}

http_response_code(200);
echo $encoded ?: '{"error":"encode-fail"}';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generieke HTTP GET met JSON-respons. Returns associative array of throws.
 */
function http_json_get(string $url, array $headers, int $timeout = 8): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_CONNECTTIMEOUT => 3,
    ]);
    $resp = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    if ($resp === false) {
        throw new RuntimeException('curl-fail: ' . $err);
    }
    if ($code < 200 || $code >= 300) {
        $snippet = is_string($resp) ? substr($resp, 0, 200) : '';
        throw new RuntimeException("HTTP $code: $snippet");
    }
    $data = json_decode($resp, true);
    if (!is_array($data)) {
        throw new RuntimeException('invalid-json-response');
    }
    return $data;
}

function brevo_headers(string $apiKey): array {
    return [
        'Accept: application/json',
        'api-key: ' . $apiKey,
    ];
}

/**
 * Brevo: count contacten in list X met createdAt tussen [sinceTs, untilTs].
 * Paginates max 10x500=5000 contacts/window. Aanname: scan-volume past hier
 * ruim binnen voor V0 (~24/maand verwacht).
 */
function brevo_count_contacts_in_list_since(string $apiKey, int $listId, int $sinceTs, int $untilTs): int {
    $contacts = brevo_fetch_list_contacts_since($apiKey, $listId, $sinceTs, $untilTs);
    return count($contacts);
}

function brevo_fetch_list_contacts_since(string $apiKey, int $listId, int $sinceTs, int $untilTs): array {
    $modifiedSince = gmdate('Y-m-d\TH:i:s.000\Z', $sinceTs);
    $out    = [];
    $offset = 0;
    $limit  = 500;
    $maxIter = 10;
    for ($i = 0; $i < $maxIter; $i++) {
        $url = sprintf(
            'https://api.brevo.com/v3/contacts/lists/%d/contacts?modifiedSince=%s&limit=%d&offset=%d&sort=desc',
            $listId,
            rawurlencode($modifiedSince),
            $limit,
            $offset
        );
        $data = http_json_get($url, brevo_headers($apiKey));
        $batch = is_array($data['contacts'] ?? null) ? $data['contacts'] : [];
        foreach ($batch as $c) {
            $createdAt = strtotime((string)($c['createdAt'] ?? ''));
            if ($createdAt && $createdAt >= $sinceTs && $createdAt < $untilTs) {
                $out[] = $c;
            }
        }
        if (count($batch) < $limit) break;
        $offset += $limit;
    }
    return $out;
}

/**
 * Brevo: SMTP stats per template binnen window.
 *
 * Let op: /smtp/statistics/aggregatedReport ondersteunt geen templateId-filter;
 * Brevo negeert die parameter en geeft dan account-brede totalen terug. Daarom
 * gebruiken we de unaggregated events-route, waar templateId wel officieel wordt
 * ondersteund, en aggregeren we hier zelf naar PII-vrije totalen.
 */
function brevo_template_stats(string $apiKey, int $templateId, int $sinceTs, int $untilTs): array {
    $events = brevo_fetch_template_events($apiKey, $templateId, $sinceTs, $untilTs);

    $messages = [];
    $delivered = [];
    $opened = [];
    $clicked = [];
    $hardBounces = [];
    $softBounces = [];
    $unsubscribed = [];
    $complaints = [];

    foreach ($events as $idx => $event) {
        if (!is_array($event)) continue;

        $name = normalize_brevo_event_name((string)($event['event'] ?? ''));
        $key  = brevo_event_message_key($event, $templateId, $idx);
        $messages[$key] = true;

        if (in_array($name, ['delivered'], true)) {
            $delivered[$key] = true;
        } elseif (in_array($name, ['open', 'opened', 'opens', 'uniqueopen', 'uniqueopened', 'uniqueopens'], true)) {
            $opened[$key] = true;
        } elseif (in_array($name, ['click', 'clicked', 'clicks', 'uniqueclick', 'uniqueclicked', 'uniqueclicks'], true)) {
            $clicked[$key] = true;
        } elseif (in_array($name, ['hardbounce', 'hardbounces', 'hard_bounce'], true)) {
            $hardBounces[$key] = true;
        } elseif (in_array($name, ['softbounce', 'softbounces', 'soft_bounce'], true)) {
            $softBounces[$key] = true;
        } elseif (in_array($name, ['unsubscribe', 'unsubscribed', 'unsub'], true)) {
            $unsubscribed[$key] = true;
        } elseif (in_array($name, ['spam', 'spamreport', 'spamreports', 'complaint', 'complaints'], true)) {
            $complaints[$key] = true;
        }
    }

    return [
        'sent'         => count($messages),
        'delivered'    => count($delivered),
        'opens'        => count($opened),
        'clicks'       => count($clicked),
        'hardBounces'  => count($hardBounces),
        'softBounces'  => count($softBounces),
        'unsubscribed' => count($unsubscribed),
        'complaints'   => count($complaints),
        'event_count'  => count($events),
        'source'       => 'events',
    ];
}

function brevo_fetch_template_events(string $apiKey, int $templateId, int $sinceTs, int $untilTs): array {
    $out = [];
    $offset = 0;
    $limit = 5000;
    $maxPages = 5;

    for ($i = 0; $i < $maxPages; $i++) {
        $url = sprintf(
            'https://api.brevo.com/v3/smtp/statistics/events?templateId=%d&startDate=%s&endDate=%s&limit=%d&offset=%d&sort=asc',
            $templateId,
            gmdate('Y-m-d', $sinceTs),
            gmdate('Y-m-d', $untilTs),
            $limit,
            $offset
        );
        $data = http_json_get($url, brevo_headers($apiKey));
        $batch = is_array($data['events'] ?? null) ? $data['events'] : [];
        foreach ($batch as $event) {
            if (is_array($event)) {
                $out[] = $event;
            }
        }
        if (count($batch) < $limit) break;
        $offset += $limit;
    }

    return $out;
}

function normalize_brevo_event_name(string $event): string {
    return strtolower(str_replace(['-', ' ', '_'], '', trim($event)));
}

function brevo_event_message_key(array $event, int $templateId, int $idx): string {
    $messageId = trim((string)($event['messageId'] ?? ''));
    if ($messageId !== '') {
        return $messageId;
    }

    $email = strtolower(trim((string)($event['email'] ?? '')));
    if ($email !== '') {
        return sha1($templateId . '|' . $email);
    }

    return 'event-' . $templateId . '-' . $idx;
}

/**
 * Brevo: aggregated stats account-breed binnen window (voor M6).
 */
function brevo_aggregated_health(string $apiKey, int $sinceTs, int $untilTs): array {
    $url = sprintf(
        'https://api.brevo.com/v3/smtp/statistics/aggregatedReport?startDate=%s&endDate=%s',
        gmdate('Y-m-d', $sinceTs),
        gmdate('Y-m-d', $untilTs)
    );
    $data = http_json_get($url, brevo_headers($apiKey));
    return [
        'delivered'    => (int)($data['delivered']    ?? 0),
        'hardBounces'  => (int)($data['hardBounces']  ?? 0),
        'softBounces'  => (int)($data['softBounces']  ?? 0),
        'unsubscribed' => (int)($data['unsubscribed'] ?? 0),
        'complaints'   => (int)($data['spamReports']  ?? $data['complaints'] ?? 0),
    ];
}

/**
 * Calendly: count active events binnen window voor de geauthenticeerde user.
 * Vereist CALENDLY_API_TOKEN met read:events scope.
 */
function calendly_count_events_since(string $token, int $sinceTs, int $untilTs): int {
    $me = http_json_get(
        'https://api.calendly.com/users/me',
        ['Authorization: Bearer ' . $token, 'Accept: application/json']
    );
    $userUri = (string)($me['resource']['uri'] ?? '');
    if ($userUri === '') {
        throw new RuntimeException('calendly-no-user-uri');
    }
    $url = sprintf(
        'https://api.calendly.com/scheduled_events?user=%s&min_start_time=%s&max_start_time=%s&status=active&count=100',
        rawurlencode($userUri),
        rawurlencode(gmdate('c', $sinceTs)),
        rawurlencode(gmdate('c', $untilTs))
    );
    $data = http_json_get($url, ['Authorization: Bearer ' . $token, 'Accept: application/json']);
    return count(is_array($data['collection'] ?? null) ? $data['collection'] : []);
}

// ---------- Classification helpers ----------

function compute_delta_pct(int $current, int $previous): ?int {
    if ($previous === 0) return $current === 0 ? 0 : null;
    return (int)round((($current - $previous) / $previous) * 100);
}

function classify_scans(int $n): string {
    if ($n < THRESHOLD_SCANS_RED)   return 'red';
    if ($n <= THRESHOLD_SCANS_GREEN) return 'orange';
    return 'green';
}

function classify_calls(int $n): string {
    if ($n < THRESHOLD_CALLS_RED)   return 'red';
    if ($n <= THRESHOLD_CALLS_GREEN) return 'orange';
    return 'green';
}

function classify_conversion(float $pct): string {
    if ($pct < THRESHOLD_CONV_RED_PCT)   return 'red';
    if ($pct < THRESHOLD_CONV_GREEN_PCT) return 'orange';
    return 'green';
}

function classify_f4(float $pct): string {
    if ($pct < THRESHOLD_F4_RED_PCT)   return 'red';
    if ($pct < THRESHOLD_F4_GREEN_PCT) return 'orange';
    return 'green';
}
