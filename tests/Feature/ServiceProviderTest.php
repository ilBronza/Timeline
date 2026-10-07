<?php

namespace IlBronza\Timeline\Tests\Feature;

use IlBronza\Timeline\Tests\TestCase;
use IlBronza\Timeline\TimelineServiceProvider;
use Illuminate\Support\ServiceProvider;
use PHPUnit\Framework\Attributes\DataProvider;

class ServiceProviderTest extends TestCase
{
    public function test_default_configuration_is_registered(): void
    {
        $this->assertSame(60, config('timeline.zoom'));
        $this->assertNull(config('timeline.updatableItemClass'));
        $this->assertSame(['js' => 'js/timeline.js', 'css' => 'css/timeline.css'], config('timeline.assets'));
    }

    public function test_register_preserves_host_configuration(): void
    {
        config(['timeline.zoom' => 21, 'timeline.updatableItemClass' => 'HostModel', 'timeline.assets' => ['js' => 'custom.js', 'css' => 'custom.css']]);
        (new TimelineServiceProvider($this->app))->register();
        $this->assertSame(21, config('timeline.zoom'));
        $this->assertSame('HostModel', config('timeline.updatableItemClass'));
        $this->assertSame('custom.js', config('timeline.assets.js'));
    }

    #[DataProvider('views')]
    public function test_views_are_registered(string $name): void
    {
        $this->assertTrue(view()->exists('timeline::' . $name));
    }

    public static function views(): array
    {
        return array_map(fn ($name) => [$name], ['timeline', '_timeline', '_timelineConfig', '_timelineAssets', '_timelineModal', 'modal', 'group-modal']);
    }

    #[DataProvider('publishTags')]
    public function test_publish_tags_map_existing_sources_to_the_host_project(string $tag, array $destinations): void
    {
        $paths = ServiceProvider::pathsToPublish(TimelineServiceProvider::class, $tag);
        $this->assertCount(count($destinations), $paths);
        foreach (array_keys($paths) as $source) { $this->assertFileExists($source); }
        foreach ($destinations as $suffix) {
            $this->assertContains(base_path($suffix), array_values($paths));
        }
    }

    public static function publishTags(): array
    {
        return [['timeline.config', ['config/timeline.php']], ['timeline.views', ['resources/views/vendor/timeline']],
            ['timeline.assets', ['resources/js/timeline.js', 'resources/less/timeline.less']]];
    }

    #[DataProvider('routes')]
    public function test_modal_routes_are_get_only_and_protected(string $name, string $controller): void
    {
        $route = app('router')->getRoutes()->getByName($name);
        $this->assertNotNull($route);
        $this->assertSame(['GET', 'HEAD'], $route->methods());
        $this->assertSame('IlBronza\\Timeline\\Http\\Controllers\\' . $controller . '@show', $route->getActionName());
        $this->assertContains('web', $route->middleware());
        $this->assertContains('auth', $route->middleware());
        $this->assertStringStartsWith('timeline/', $route->uri());
    }

    public static function routes(): array
    {
        return [['timeline.itemModal', 'TimelineItemModalController'], ['timeline.groupModal', 'TimelineGroupModalController']];
    }
}
