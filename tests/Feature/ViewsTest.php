<?php

namespace IlBronza\Timeline\Tests\Feature;

use IlBronza\Timeline\Tests\Fixtures\Group;
use IlBronza\Timeline\Tests\TestCase;

class ViewsTest extends TestCase
{
    private function configData(array $overrides = []): array
    {
        return array_merge(['apiEndpoint' => '/api/planning'], $overrides);
    }

    public function test_config_is_valid_json_with_readonly_defaults(): void
    {
        $html = view('timeline::_timelineConfig', $this->configData())->render();
        $this->assertSame(['apiUrl' => '/api/planning', 'updateUrl' => '', 'createRowFormUrl' => '', 'zoomDays' => 60], $this->decodeConfig($html));
    }

    public function test_config_preserves_explicit_values_and_cannot_break_out_of_script_tag(): void
    {
        $url = '/search?q=</script><script>alert("x")</script>&name=\'x\'';
        $html = view('timeline::_timelineConfig', $this->configData([
            'apiEndpoint' => $url, 'timelineUpdateRoute' => '/update',
            'timelineCreateRowFormEndpoint' => '/create', 'zoom' => 7,
        ]))->render();
        $this->assertSame(['apiUrl' => $url, 'updateUrl' => '/update', 'createRowFormUrl' => '/create', 'zoomDays' => 7], $this->decodeConfig($html));
        $this->assertSame(1, substr_count($html, '</script>'));
        $this->assertStringNotContainsString('<script>alert', $html);
    }

    public function test_assets_use_configured_paths_and_defer_javascript(): void
    {
        config(['timeline.assets.js' => 'custom/planning.js', 'timeline.assets.css' => 'custom/planning.css']);
        $html = view('timeline::_timelineAssets', $this->configData())->render();
        $this->assertStringContainsString('href="http://localhost/custom/planning.css"', $html);
        $this->assertStringContainsString('src="http://localhost/custom/planning.js" defer', $html);
        $this->assertStringNotContainsString('?v=', $html);
        $this->assertStringContainsString('id="timeline-config"', $html);
    }

    public function test_existing_assets_receive_a_filemtime_version(): void
    {
        $path = public_path('test-timeline.js');
        file_put_contents($path, '// test asset');
        try {
            config(['timeline.assets.js' => 'test-timeline.js']);
            $html = view('timeline::_timelineAssets', $this->configData())->render();
            $this->assertStringContainsString('test-timeline.js?v=' . filemtime($path), $html);
        } finally { unlink($path); }
    }

    public function test_modal_renders_buttons_in_order_and_omits_empty_wrapper(): void
    {
        $this->assertSame('', trim(view('timeline::modal', ['buttons' => collect()])->render()));
        $button = new class {
            public function render(): string { return '<a href="/edit">Edit</a>'; }
        };
        $html = view('timeline::modal', ['buttons' => collect([$button])])->render();
        $this->assertStringContainsString('<a href="/edit">Edit</a>', $html);
        $this->assertStringNotContainsString('&lt;a', $html);
    }

    public function test_group_modal_escapes_model_labels(): void
    {
        $html = view('timeline::group-modal', [
            'model' => new Group(['id' => 42, 'name' => '<script>alert(1)</script>']),
            'buttons' => collect(),
        ])->render();
        $this->assertStringContainsString('&lt;script&gt;alert(1)&lt;/script&gt;', $html);
        $this->assertStringContainsString('<dd>42</dd>', $html);
        $this->assertStringNotContainsString('<script>', $html);
    }

    public function test_timeline_page_renders_without_a_model_and_exposes_all_frontend_mount_points(): void
    {
        // The host layout is outside this package; render the real Timeline
        // page and partials in a minimal layout with the same content section.
        view()->replaceNamespace('uikittemplate', __DIR__ . '/../Fixtures/views/layout');
        $html = view('timeline::timeline', $this->configData(['pageTitle' => 'Planning', 'buttons' => collect()]))->render();
        $this->assertStringContainsString('<h1>Planning</h1>', $html);
        foreach (['timelinecontainer', 'timeline-config', 'timeline-groups-filter-modal',
            'timeline-groups-filter-all', 'timeline-groups-filter-none', 'timeline-groups-filter-list',
            'timeline-groups-filter-badge', 'timeline-item-modal-template'] as $id) {
            $this->assertSame(1, substr_count($html, 'id="' . $id . '"'), $id);
        }
    }

    private function decodeConfig(string $html): array
    {
        preg_match('/<script[^>]*>(.*?)<\/script>/s', $html, $matches);
        return json_decode($matches[1], true, 512, JSON_THROW_ON_ERROR);
    }
}
