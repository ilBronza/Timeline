<?php

namespace IlBronza\Timeline\Tests\Unit;

use IlBronza\Timeline\Http\Controllers\BaseTimelineController;
use IlBronza\Timeline\Tests\Fixtures\Group;
use IlBronza\Timeline\Tests\Fixtures\Item;
use IlBronza\Timeline\Tests\Fixtures\TimelineController;
use IlBronza\Timeline\Tests\TestCase;
use Illuminate\Database\Eloquent\Model;
use PHPUnit\Framework\Attributes\DataProvider;

class TimelineControllerTest extends TestCase
{
    #[DataProvider('optionNames')]
    public function test_option_names_resolve_to_studly_methods(string $option, string $method): void
    {
        $this->assertSame($method, (new TimelineController())->getOptionMethod($option));
    }

    public static function optionNames(): array
    {
        return [['main', 'getMainTimelineData'], ['subgroups', 'getSubgroupsTimelineData'],
            ['by_supplier', 'getBySupplierTimelineData'], ['by-supplier', 'getBySupplierTimelineData'],
            ['by supplier', 'getBySupplierTimelineData']];
    }

    public function test_empty_response_has_frontend_contract(): void
    {
        $controller = new TimelineController();
        $this->assertSame(['timeline', 'container'], $controller->allowedMethods);
        $this->assertSame(['itemTemplate' => 'operator', 'groups' => [], 'items' => []], $controller->sendResponse());
        $this->assertNull($controller->getTimelineCreateRowFormEndpoint());
    }

    #[DataProvider('nestedGroups')]
    public function test_nested_groups_omit_gantt_automatically_unless_explicitly_overridden($parent, ?bool $override, bool $expected): void
    {
        $controller = new TimelineController();
        $controller->groups = [$parent];
        $controller->createGroupsByCollection(collect([new Group(['id' => 7])]), $override);
        $this->assertSame($parent, $controller->groups[0]);
        $this->assertCount($expected ? 1 : 0, $controller->groups[1]->actions);
    }

    public static function nestedGroups(): array
    {
        return [
            'array parent, integer child' => [['nestedGroups' => [7]], null, false],
            'object parent, string child' => [(object) ['nestedGroups' => ['7']], null, false],
            'top level' => [['id' => 2], null, true],
            'force nested gantt' => [['nestedGroups' => [7]], true, true],
            'disable top level gantt' => [(object) ['id' => 2], false, false],
            'no accidental prefix match' => [['nestedGroups' => [70]], null, true],
        ];
    }

    public function test_collections_append_in_order_and_empty_collections_preserve_existing_data(): void
    {
        $controller = new TimelineController();
        foreach ([1, 2] as $id) {
            $controller->createGroupsByCollection(collect([new Group(['id' => $id])]), false);
            $controller->createItemsByCollection(collect([new Item(['id' => $id])]));
        }
        $controller->createGroupsByCollection(collect());
        $controller->createItemsByCollection(collect());
        $this->assertSame(['1', '2'], array_column($controller->getGroups(), 'id'));
        $this->assertSame(['1', '2'], array_column($controller->getItems(), 'id'));
    }

    public function test_main_timeline_joins_items_to_supplier_groups(): void
    {
        $controller = $this->populatedController();
        $response = $controller->getMainTimelineData();
        $this->assertSame('4', $response['groups'][0]->id);
        $this->assertSame('4', $response['items'][0]->group);
        $this->assertCount(1, $response['groups'][0]->actions);
    }

    public function test_subgroup_hooks_use_the_selected_getter_and_omit_gantt(): void
    {
        $controller = $this->populatedController();
        $controller->subgroupGetter = 'getSupplierTimelineGroup';
        $response = $controller->getSubgroupsTimelineData();
        $this->assertSame('4', $response['items'][0]->group);
        $this->assertSame([], $response['groups'][0]->actions);
    }

    public function test_default_subgroup_hooks_return_an_empty_timeline(): void
    {
        $controller = new class extends BaseTimelineController {
            public function __construct() {}
            public function getEndpoint(): string { return '/timeline'; }
        };
        $this->assertSame(['itemTemplate' => 'operator', 'groups' => [], 'items' => []], $controller->getSubgroupsTimelineData());
    }

    public function test_group_getter_can_return_null(): void
    {
        $controller = new TimelineController();
        $controller->createItemsByCollectionAndGetter(collect([new Item(['id' => 1])]), 'getSupplierTimelineGroup');
        $this->assertNull($controller->items[0]->group);
    }

    public function test_update_route_is_disabled_by_default(): void
    {
        $this->assertNull((new TimelineController())->getTimelineUpdateRoute());
    }

    public function test_update_route_uses_configured_model_and_placeholder(): void
    {
        config(['timeline.updatableItemClass' => Item::class, 'datatables.replace_model_id_string' => '__ID__']);
        $this->assertSame('/items/__ID__/asTimelineItem.update', (new TimelineController())->getTimelineUpdateRoute());
    }

    public function test_update_route_resolves_project_class_via_gpc(): void
    {
        config(['timeline.updatableItemClass' => ProjectItemResolver::class, 'datatables.replace_model_id_string' => 'REPLACE']);
        $this->assertSame('/items/REPLACE/asTimelineItem.update', (new TimelineController())->getTimelineUpdateRoute());
    }

    public function test_configured_model_can_return_a_null_update_route(): void
    {
        config(['timeline.updatableItemClass' => ReadOnlyItem::class]);
        $this->assertNull((new TimelineController())->getTimelineUpdateRoute());
    }

    #[DataProvider('zooms')]
    public function test_container_passes_endpoints_model_buttons_title_and_zoom(?int $override, ?int $configured, int $expected): void
    {
        $controller = new TimelineController();
        $controller->zoom = $override;
        $controller->modelInstance = new Group(['id' => 1]);
        if ($configured === null) { config(['timeline' => []]); }
        else { config(['timeline.zoom' => $configured]); }
        $view = $controller->returnGanttContainer();
        $this->assertSame('timeline::timeline', $view->name());
        $data = $view->getData();
        $this->assertSame('Planning', $data['pageTitle']);
        $this->assertSame('/api/timeline/main', $data['apiEndpoint']);
        $this->assertSame($expected, $data['zoom']);
        $this->assertSame($controller->modelInstance, $data['modelInstance']);
        $this->assertSame(['button'], $data['buttons']->all());
        $this->assertNull($data['timelineUpdateRoute']);
        $this->assertNull($data['timelineCreateRowFormEndpoint']);
    }

    public static function zooms(): array { return [[null, 60, 60], [7, 60, 7], [null, null, 14], [0, 60, 0]]; }

    private function populatedController(): TimelineController
    {
        $controller = new TimelineController();
        $group = new Group(['id' => 4]);
        $item = new Item(['id' => 9]);
        $item->timelineGroup = $group;
        $controller->groupModels = [$group];
        $controller->rows = [$item];
        return $controller;
    }
}

class ProjectItemResolver { public static function gpc(): string { return Item::class; } }
class ReadOnlyItem extends Model { public function getTimelineUpdateUrl(): ?string { return null; } }
