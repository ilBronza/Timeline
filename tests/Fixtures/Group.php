<?php

namespace IlBronza\Timeline\Tests\Fixtures;

use IlBronza\Timeline\Interfaces\TimelineGroupInterface;
use IlBronza\Timeline\Traits\IsTimelineGroupTrait;
use Illuminate\Database\Eloquent\Model;

class Group extends Model implements TimelineGroupInterface
{
    use IsTimelineGroupTrait;

    public $timestamps = false;
    public $incrementing = false;
    protected $guarded = [];
    protected $table = 'timeline_test_groups';
    public array $actions = [];
    public int $ganttCalls = 0;

    public function getName(): string { return $this->name ?? 'Production'; }
    public function getCssBackgroundColorValue(): ?string { return $this->background; }
    public function getCssTextColorValue(): ?string { return $this->foreground; }
    public function getTimelineBindingDataArray(): array { return []; }
    public function getTimelineGroupActions(): array { return $this->actions; }
    public function getGanttUrl(): string
    {
        $this->ganttCalls++;
        return '/groups/' . $this->getKey() . '/gantt';
    }
}
