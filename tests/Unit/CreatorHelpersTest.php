<?php

namespace IlBronza\Timeline\Tests\Unit;

use Carbon\Carbon;
use IlBronza\Timeline\Helpers\TimelineGroupCreatorHelper as Groups;
use IlBronza\Timeline\Helpers\TimelineItemCreatorHelper as Items;
use IlBronza\Timeline\Interfaces\TimelineGroupInterface;
use IlBronza\Timeline\Interfaces\TimelineItemInterface;
use IlBronza\Timeline\Tests\Fixtures\Group;
use IlBronza\Timeline\Tests\Fixtures\Item;
use IlBronza\Timeline\Tests\TestCase;
use Illuminate\Database\Eloquent\Relations\Relation;
use PHPUnit\Framework\Attributes\DataProvider;

class CreatorHelpersTest extends TestCase
{
    public function test_group_exports_identity_labels_colors_and_modal_url(): void
    {
        Relation::morphMap(['work-group' => Group::class]);
        $model = new Group(['id' => 12, 'name' => 'Cut & sew', 'background' => '#123', 'foreground' => '#fff']);
        $group = Groups::createGroupByModel($model);

        $this->assertSame('12', $group->id);
        $this->assertSame(12, $group->key);
        $this->assertSame('work-group', $group->model);
        $this->assertSame('Cut & sew', $group->content);
        $this->assertSame('Cut & sew', $group->name);
        $this->assertSame(['group-cut-sew'], $group->htmlClasses);
        $this->assertSame(['background-color' => '#123', 'color' => '#fff'], $group->cssStyles);
        $this->assertSame('background-color: #123; color: #fff;', $group->style);
        $this->assertSame(route('timeline.groupModal', ['model' => 'work-group', 'key' => 12]), $group->modalUrl);
    }

    public function test_gantt_action_is_appended_without_mutating_model_actions(): void
    {
        $model = new Group(['id' => 'g-1']);
        $model->actions = [['action' => 'inspect', 'payload' => ['id' => 1]]];
        $group = Groups::createGroupByModel($model);
        $this->assertSame([
            ['action' => 'inspect', 'payload' => ['id' => 1]],
            ['action' => 'open', 'faIcon' => 'chart-gantt', 'title' => 'Gantt Production', 'url' => '/groups/g-1/gantt'],
        ], $group->actions);
        $this->assertCount(1, $model->actions);
        $this->assertCount(2, Groups::createGroupByModel($model)->actions);
    }

    public function test_disabling_gantt_keeps_custom_actions_and_does_not_resolve_gantt_url(): void
    {
        $model = new Group(['id' => 'g-1']);
        $model->actions = [['action' => 'inspect']];
        $group = Groups::createGroupByModel($model, false);
        $this->assertSame($model->actions, $group->actions);
        $this->assertSame(0, $model->ganttCalls);
        $this->assertSame('', $group->style);
    }

    #[DataProvider('keys')]
    public function test_group_preserves_numeric_and_string_keys($key): void
    {
        $model = new Group(['id' => $key]);
        $model->setKeyType(is_int($key) ? 'int' : 'string');
        $group = Groups::createGroupByModel($model, false);
        $this->assertSame((string) $key, $group->id);
        $this->assertSame($key, $group->key);
    }

    public static function keys(): array
    {
        return ['integer' => [42], 'zero' => [0], 'uuid' => ['b12d-abc'], 'leading zero' => ['007']];
    }

    public function test_item_exports_all_model_values_and_forwards_the_same_group_to_every_getter(): void
    {
        $group = $this->createMock(TimelineGroupInterface::class);
        $group->method('getTimelineGroupId')->willReturn('g-4');
        $model = $this->createMock(TimelineItemInterface::class);
        $values = [
            'getTimelineItemId' => ['id', 'item-7'],
            'getTimelineItemActions' => ['links', [['url' => '/left']]],
            'getTimelineItemRightLinks' => ['rightLinks', [['url' => '/right']]],
            'getTimelineItemStartsAt' => ['start', Carbon::parse('2026-01-01 08:00:00', 'Europe/Rome')],
            'getTimelineItemEndsAt' => ['end', Carbon::parse('2026-01-03 18:00:00', 'Europe/Rome')],
            'getTimelineItemType' => ['itemType', 'work'],
            'getTimelineItemProgress' => ['progress', 45.5],
            'getTimelineItemCssStyles' => ['cssStyles', ['background-color' => 'red', 'opacity' => 0]],
            'getTimelineItemTitle' => ['title', 'Cutting'],
            'getTimelineItemPopuptitle' => ['popupTitle', 'Cutting details'],
            'getTimelineItemUpdateUrl' => ['updateUrl', '/update'],
            'getTimelineItemDeleteUrl' => ['deleteUrl', '/delete'],
            'getTimelineItemModalUrl' => ['modalUrl', '/modal'],
            'getTimelineItemDescription' => ['description', 'Instructions'],
            'getTimelineItemHtmlClasses' => ['htmlClasses', ['urgent', 'work']],
        ];
        foreach ($values as $method => [$property, $value]) {
            $model->expects($this->once())->method($method)->with($this->identicalTo($group))->willReturn($value);
        }
        $item = Items::createItemByModel($model, $group);
        foreach ($values as [$property, $value]) {
            $this->assertSame($value, $item->$property, $property);
        }
        $this->assertSame('g-4', $item->group);
        $this->assertSame('background-color: red; opacity: 0;', $item->style);
    }

    public function test_ungrouped_item_has_explicit_null_group_and_optional_values(): void
    {
        $item = Items::createItemByModel(new Item(['id' => 1]));
        $this->assertNull($item->group);
        $this->assertNull($item->updateUrl);
        $this->assertNull($item->deleteUrl);
        $this->assertNull($item->description);
        $this->assertSame('', $item->style);
    }

    public function test_response_serializes_dates_and_optional_fields_for_the_frontend(): void
    {
        $model = new Item(['id' => 1]);
        $model->startsAt = Carbon::parse('2026-01-01 08:00:00', 'UTC');
        $model->endsAt = Carbon::parse('2026-01-02 08:00:00', 'UTC');
        $data = json_decode(json_encode(Items::createItemByModel($model), JSON_THROW_ON_ERROR), true);
        $this->assertSame('2026-01-01T08:00:00.000000Z', $data['start']);
        $this->assertSame('2026-01-02T08:00:00.000000Z', $data['end']);
        $this->assertArrayHasKey('group', $data);
        $this->assertArrayHasKey('updateUrl', $data);
        $this->assertNull($data['group']);
        $this->assertNull($data['updateUrl']);
    }
}
