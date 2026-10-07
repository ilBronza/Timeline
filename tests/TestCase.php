<?php

namespace IlBronza\Timeline\Tests;

use Carbon\Carbon;
use IlBronza\Timeline\TimelineServiceProvider;
use Illuminate\Database\Eloquent\Relations\Relation;
use Orchestra\Testbench\TestCase as Orchestra;

abstract class TestCase extends Orchestra
{
    protected function getPackageProviders($app)
    {
        return [TimelineServiceProvider::class];
    }

    protected function defineEnvironment($app)
    {
        $app->useStoragePath(__DIR__ . '/.runtime/storage');
        $app->usePublicPath(__DIR__ . '/.runtime/public');
        $app['config']->set('view.compiled', __DIR__ . '/.runtime/views');
        $app['config']->set('app.key', 'base64:' . base64_encode(str_repeat('t', 32)));
        $app['config']->set('app.locale', 'en');
        $app['config']->set('database.default', 'testing');
        $app['config']->set('database.connections.testing', [
            'driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '',
        ]);
        $app['config']->set('session.driver', 'array');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        Relation::morphMap([], false);
        parent::tearDown();
    }
}
