<?php

namespace IlBronza\Timeline\Tests\Unit;

use Carbon\Carbon;
use IlBronza\Timeline\Tests\Fixtures\Group;
use IlBronza\Timeline\Tests\Fixtures\Item;
use IlBronza\Timeline\Tests\TestCase;
use PHPUnit\Framework\Attributes\DataProvider;

class ModelTraitsTest extends TestCase
{
    public function test_dates_fall_back_to_now_and_three_days_later(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-12-31 14:30:00', 'Europe/Rome'));
        $item = new Item();
        $this->assertTrue($item->getTimelineItemStartsAt(null)->equalTo(Carbon::now()));
        $this->assertTrue($item->getTimelineItemEndsAt(null)->equalTo(Carbon::now()->addDays(3)));
        $this->assertSame('2026-12-31 14:30:00', Carbon::now('Europe/Rome')->toDateTimeString());
    }

    public function test_explicit_dates_are_preserved_with_their_timezone(): void
    {
        $item = new Item();
        $item->startsAt = Carbon::parse('2026-03-28 10:00', 'Europe/Rome');
        $item->endsAt = Carbon::parse('2026-03-30 10:00', 'Europe/Rome');
        $this->assertSame($item->startsAt, $item->getTimelineItemStartsAt(null));
        $this->assertSame($item->endsAt, $item->getTimelineItemEndsAt(null));
    }

    public function test_a_missing_end_does_not_replace_an_explicit_start(): void
    {
        Carbon::setTestNow('2026-01-01 08:00:00');
        $item = new Item();
        $item->startsAt = Carbon::parse('2025-12-01');
        $this->assertSame($item->startsAt, $item->getTimelineItemStartsAt(null));
        $this->assertSame('2026-01-04 08:00:00', $item->getTimelineItemEndsAt(null)->toDateTimeString());
    }

    public function test_item_identity_type_title_and_classes_use_the_model_and_group(): void
    {
        $item = new Item(['id' => 42, 'description' => 'Sew carefully']);
        $group = new Group(['id' => 3, 'name' => 'Assembly']);
        $this->assertSame('42', $item->getTimelineItemId($group));
        $this->assertSame('Item', $item->getTimelineItemType(null));
        $this->assertSame('Item-Group', $item->getTimelineItemType($group));
        $this->assertSame('Work for Assembly', $item->getTimelineItemTitle($group));
        $this->assertSame('Work', $item->getTimelineItemTitle(null));
        $this->assertSame(['Item'], $item->getTimelineItemHtmlClasses($group));
        $this->assertSame('Sew carefully', $item->getTimelineItemDescription($group));
        $this->assertSame(0.0, $item->getTimelineItemProgress($group));
    }

    #[DataProvider('colors')]
    public function test_item_and_group_colors_are_only_emitted_with_a_background(?string $background, ?string $foreground, array $expected): void
    {
        $attributes = ['background' => $background, 'foreground' => $foreground];
        $this->assertSame($expected, (new Item($attributes))->getTimelineItemCssStyles(null));
        $this->assertSame($expected, (new Group($attributes))->getTimelineGroupCssStyles());
    }

    public static function colors(): array
    {
        return [
            'none' => [null, null, []], 'empty' => ['', '#fff', []],
            'foreground only' => [null, 'red', []],
            'both' => ['#000', '#fff', ['background-color' => '#000', 'color' => '#fff']],
            'background only' => ['red', null, ['background-color' => 'red', 'color' => null]],
        ];
    }

    #[DataProvider('labels')]
    public function test_group_labels_become_css_classes(string $label, string $class): void
    {
        $group = new Group(['id' => 1, 'name' => $label]);
        $this->assertSame($label, $group->getTimelineGroupName());
        $this->assertSame($label, $group->getTimelineGroupContent());
        $this->assertSame([$class], $group->getTimelineGroupHtmlClasses());
    }

    public static function labels(): array
    {
        return [['Cut & Sew', 'group-cut-sew'], ['È già pronto', 'group-e-gia-pronto'], ['', 'group-']];
    }

    public function test_update_and_delete_urls_are_forwarded(): void
    {
        $item = new Item(['id' => 8, 'update_url' => '/edit/8', 'delete_url' => '/delete/8']);
        $this->assertSame('/edit/8', $item->getTimelineItemUpdateUrl(null));
        $this->assertSame('/delete/8', $item->getTimelineItemDeleteUrl(null));
        $this->assertSame('/items/8/asTimelineItem.update', $item->getTimelineUpdateUrl());
    }

    public function test_optional_routes_return_null_when_route_resolution_fails(): void
    {
        $item = new Item();
        $item->failRoute = $item->failDelete = true;
        $this->assertNull($item->getTimelineUpdateUrl());
        $this->assertNull($item->getTimelineItemDeleteUrl(null));
    }

    public function test_modal_routes_round_trip_model_class_and_key(): void
    {
        foreach ([new Item(['id' => 'abc-123']), new Group(['id' => 'abc-123'])] as $model) {
            $url = $model instanceof Item ? $model->getTimelineItemModalUrl(null) : $model->getTimelineGroupModalUrl();
            $route = app('router')->getRoutes()->match(\Illuminate\Http\Request::create($url));
            $this->assertSame($model->getMorphClass(), urldecode($route->parameter('model')));
            $this->assertSame('abc-123', $route->parameter('key'));
        }
    }
}
