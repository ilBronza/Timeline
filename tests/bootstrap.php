<?php

// Prefer an ordinary Composer install; also support the existing IlBronza
// shared test environment without modifying its vendor or bootstrap files.
$root = dirname(__DIR__);
$vendor = getenv('TIMELINE_TEST_VENDOR') ?: $root . '/vendor';
$sharedVendor = dirname($root) . '/.ibtest/vendor';
if (! is_file($vendor . '/autoload.php')) {
    $vendor = $sharedVendor;
}
if (! is_file($vendor . '/autoload.php')) {
    throw new RuntimeException('Test dependencies unavailable. See tests/README.md.');
}

$loader = require $vendor . '/autoload.php';
if (realpath($vendor) === realpath($sharedVendor)) {
    foreach (glob(dirname($root) . '/*/composer.json') as $manifest) {
        $package = json_decode(file_get_contents($manifest), true, 512, JSON_THROW_ON_ERROR);
        foreach ($package['autoload']['psr-4'] ?? [] as $namespace => $paths) {
            $loader->addPsr4($namespace, array_map(
                fn ($path) => dirname($manifest) . '/' . $path, (array) $paths
            ), true);
        }
    }
}
$loader->addPsr4('IlBronza\\Timeline\\', $root . '/src', true);
$loader->addPsr4('IlBronza\\Timeline\\Tests\\', __DIR__, true);
$loader->addPsr4('App\\', __DIR__ . '/Fixtures/App', true);

// Keep Laravel's generated files inside this package, even with a shared vendor.
$runtime = __DIR__ . '/.runtime';
foreach (['views', 'cache', 'storage/framework/sessions', 'public'] as $directory) {
    if (! is_dir($runtime . '/' . $directory)) {
        mkdir($runtime . '/' . $directory, 0777, true);
    }
}
foreach (['APP_SERVICES_CACHE' => 'services.php', 'APP_PACKAGES_CACHE' => 'packages.php',
          'APP_CONFIG_CACHE' => 'config.php', 'APP_ROUTES_CACHE' => 'routes.php',
          'APP_EVENTS_CACHE' => 'events.php'] as $key => $filename) {
    putenv($key . '=' . $runtime . '/cache/' . $filename);
    $_ENV[$key] = $runtime . '/cache/' . $filename;
}

return $vendor;
