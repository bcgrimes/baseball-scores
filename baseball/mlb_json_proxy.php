<?php
// ORIGINAL HEADER
// PHP Proxy example for Yahoo! Web services. 
// Responds to both HTTP GET and POST requests
//
// Author: Jason Levitt
// December 7th, 2005
//

// 12-Nov-2011, Brett C. Grimes
// Revised to provide proxy for JSON data

// Allowed hostname
define ('HOSTNAME', 'http://gd2.mlb.com/');

// Get the REST call path from the AJAX application
// Is it a POST or a GET?
$path = ($_POST['ws_path']) ? $_POST['ws_path'] : $_GET['ws_path'];
$url = HOSTNAME.$path;

// Open the Curl session
$session = curl_init($url);

// If it's a POST, put the POST data in the body
if ($_POST['ws_path']) {
	$postvars = '';
	while ($element = current($_POST)) {
		$postvars .= urlencode(key($_POST)).'='.urlencode($element).'&';
		next($_POST);
	}
	curl_setopt ($session, CURLOPT_POST, true);
	curl_setopt ($session, CURLOPT_POSTFIELDS, $postvars);
}

// Don't return HTTP headers. Do return the contents of the call
curl_setopt($session, CURLOPT_HEADER, false);
curl_setopt($session, CURLOPT_RETURNTRANSFER, true);

// Make the call
$json = curl_exec($session);

// The web service returns JSON. Set the Content-Type appropriately
header("Content-Type: application/json");

echo json_encode($json);
curl_close($session);

?>