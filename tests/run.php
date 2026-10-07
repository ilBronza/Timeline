<?php

$vendor = require __DIR__ . '/bootstrap.php';
exit((new PHPUnit\TextUI\Application())->run([
    __FILE__, '--configuration', dirname(__DIR__) . '/phpunit.xml',
    ...array_slice($_SERVER['argv'], 1),
]));
