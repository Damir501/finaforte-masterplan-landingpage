<?php
/**
 * PHP-capability probe — verifiëren of LiteSpeed PHP daadwerkelijk uitvoert.
 * Geen credentials, geen sensitive output. Mag publiek toegankelijk blijven.
 */
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store');
echo "PHP works\n";
echo "version: " . PHP_VERSION . "\n";
echo "curl: " . (function_exists('curl_init') ? 'yes' : 'no') . "\n";
echo "json: " . (function_exists('json_encode') ? 'yes' : 'no') . "\n";
echo "parse_ini_file: " . (function_exists('parse_ini_file') ? 'yes' : 'no') . "\n";
echo "server: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'unknown') . "\n";
echo "env_loaded: " . (is_readable(__DIR__ . '/.env') ? 'yes' : 'no') . "\n";
echo "time: " . date('c') . "\n";
