<?php
// verify_captcha.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// SUA SECRET KEY - COLOQUE A CHAVE COMPLETA QUE VOCÊ COPIAR DO CLOUDFLARE
define('CLOUDFLARE_SECRET_KEY', '0x4AAAAAADbp-xHu1GFGd05TCcwRZ6KjbUQ');

// Recebe o token do POST
$input = json_decode(file_get_contents('php://input'), true);
$token = $input['token'] ?? '';

if (empty($token)) {
    echo json_encode([
        'success' => false,
        'error' => 'Token não fornecido'
    ]);
    exit;
}

// Verifica o token com a Cloudflare
$verificationUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
$data = [
    'secret' => CLOUDFLARE_SECRET_KEY,
    'response' => $token,
    'remoteip' => $_SERVER['REMOTE_ADDR'] ?? ''
];

$options = [
    'http' => [
        'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
        'method' => 'POST',
        'content' => http_build_query($data)
    ]
];

$context = stream_context_create($options);
$result = file_get_contents($verificationUrl, false, $context);
$response = json_decode($result, true);

// Retorna o resultado
if ($response && isset($response['success']) && $response['success'] === true) {
    echo json_encode([
        'success' => true,
        'message' => 'Captcha validado com sucesso'
    ]);
} else {
    $errorCode = $response['error-codes'][0] ?? 'unknown';
    echo json_encode([
        'success' => false,
        'error' => "Falha na verificação: $errorCode",
        'details' => $response
    ]);
}
?>
