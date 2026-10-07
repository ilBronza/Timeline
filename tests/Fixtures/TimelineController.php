<?php

namespace IlBronza\Timeline\Tests\Fixtures;

use IlBronza\Timeline\Http\Controllers\BaseTimelineController;
use Illuminate\Support\Collection;

class TimelineController extends BaseTimelineController
{
    public ?int $zoom = null;
    public string $option = 'main';
    public array $rows = [];
    public array $groupModels = [];
    public string $subgroupGetter = 'getSubgroupTimelineGroup';

    // Isolate Timeline from the host application's CRUD setup. Feature tests
    // exercise the real modal controller constructors and HTTP middleware.
    public function __construct() { $this->modelInstance = null; }
    public function getEndpoint(): string { return '/api/timeline/' . $this->option; }
    public function setPageTitle(?string $pageTitle = null) { $this->pageTitle = $pageTitle ?? 'Planning'; }
    public function getButtons(): Collection { return collect(['button']); }
    public function getRows(): Collection { return collect($this->rows); }
    public function getGroupItems(): Collection { return collect($this->groupModels); }
    protected function getSubgroupsTimelineGroups(): Collection { return collect($this->groupModels); }
    protected function getSubgroupsTimelineItems(): Collection { return collect($this->rows); }
    protected function getSubgroupsTimelineGroupGetter(): string { return $this->subgroupGetter; }
}
