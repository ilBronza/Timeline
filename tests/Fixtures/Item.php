<?php

namespace IlBronza\Timeline\Tests\Fixtures;

use Carbon\Carbon;
use IlBronza\Timeline\Interfaces\TimelineGroupInterface;
use IlBronza\Timeline\Interfaces\TimelineItemInterface;
use IlBronza\Timeline\Traits\IsTimelineItemTrait;
use Illuminate\Database\Eloquent\Model;

class Item extends Model implements TimelineItemInterface
{
    use IsTimelineItemTrait;

    protected $guarded = [];
    public $incrementing = false;
    public ?Carbon $startsAt = null;
    public ?Carbon $endsAt = null;
    public ?Group $timelineGroup = null;
    public bool $failDelete = false;
    public bool $failRoute = false;

    public function getStartsAt(): ?Carbon { return $this->startsAt; }
    public function getEndsAt(): ?Carbon { return $this->endsAt; }
    public function getTimelineItemGroupId(?TimelineGroupInterface $groupModel): string
    {
        return $groupModel?->getTimelineGroupId() ?? 'ungrouped';
    }
    public function getTimelineItemTitleForGroup(?TimelineGroupInterface $group): string
    {
        return 'Work for ' . $group->getTimelineGroupName();
    }
    public function getTimelineItemTitleFor(?TimelineGroupInterface $group): string { return 'Work'; }
    public function getTimelineItemPopuptitle(?TimelineGroupInterface $group): string { return 'Details'; }
    public function getDescription(): ?string { return $this->description; }
    public function getCssBackgroundColorValue($group = null): ?string { return $this->background; }
    public function getCssTextColorValue(): ?string { return $this->foreground; }
    public function getTimelineItemActions(?TimelineGroupInterface $group): array { return [['url' => '/show']]; }
    public function getTimelineItemRightLinks(?TimelineGroupInterface $group): array { return [['url' => '/split']]; }
    public function getUpdateUrl(): ?string { return $this->update_url; }
    public function getDeleteUrl(): ?string
    {
        if ($this->failDelete) { throw new \RuntimeException('Route unavailable'); }
        return $this->delete_url;
    }
    public function getKeyedRoute(string $name): string
    {
        if ($this->failRoute) { throw new \RuntimeException('Route unavailable'); }
        return '/items/' . $this->getKey() . '/' . $name;
    }
    public function getSupplierTimelineGroup(): ?Group { return $this->timelineGroup; }
    public function getSubgroupTimelineGroup(): ?Group { return $this->timelineGroup; }
}
