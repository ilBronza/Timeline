# IlBronza Timeline

Gantt / timeline visualization package (based on [vis-timeline](https://visjs.github.io/vis-timeline/docs/timeline/)) for Laravel projects using the IlBronza package suite.

Extracted from `ilbronza/crud` to keep the timeline engine decoupled from domain packages.

## Installation

```bash
composer require ilbronza/timeline
```

The service provider is auto-discovered.

The host project must load the vis-timeline JS/CSS assets, e.g.:

```html
<script src="https://unpkg.com/vis-timeline@latest/standalone/umd/vis-timeline-graph2d.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/vis-timeline@latest/styles/vis-timeline-graph2d.min.css" />
```

## Configuration

```bash
php artisan vendor:publish --tag=timeline.config
```

```php
// config/timeline.php
return [
    // days visible at initial zoom
    'zoom' => 60,

    // model class used to build the drag&drop update route.
    // must use IsTimelineItemTrait (or expose getTimelineUpdateUrl())
    'updatableItemClass' => \IlBronza\Products\Models\Orders\Orderrow::class,
];
```

If `updatableItemClass` is null, the Gantt is read-only (drag updates disabled).

## Usage

### Models

A model rendered as a **bar** on the timeline:

```php
use IlBronza\Timeline\Interfaces\TimelineItemInterface;
use IlBronza\Timeline\Traits\IsTimelineItemTrait;

class Orderrow extends Model implements TimelineItemInterface
{
    use IsTimelineItemTrait;

    // requires getStartsAt() / getEndsAt() returning ?Carbon
}
```

A model used as a **group** (row container) on the timeline:

```php
use IlBronza\Timeline\Interfaces\TimelineGroupInterface;
use IlBronza\Timeline\Interfaces\GanttTimelineInterface;
use IlBronza\Timeline\Traits\IsTimelineGroupTrait;
use IlBronza\Timeline\Traits\GanttTimelineTrait;

class Order extends Model implements TimelineGroupInterface, GanttTimelineInterface
{
    use IsTimelineGroupTrait;
    use GanttTimelineTrait; // provides getGanttUrl() / getGanttButton()
}
```

### Controllers

```php
use IlBronza\Timeline\Http\Controllers\BaseTimelineController;

class OrderTimelineController extends BaseTimelineController
{
    public function getEndpoint() : string
    {
        return route('orders.timeline', $this->getModel());
    }

    public function getMainTimelineData($order)
    {
        $order = $this->findModel($order);

        $this->createGroupsByCollection($groups);
        $this->createItemsByCollectionAndGetter($order->rows, 'getSellable');

        return $this->sendResponse();
    }
}
```

Two routes per Gantt: `container` renders the page, `timeline` returns JSON data:

```php
Route::get('timeline-container/{order}/{option?}', [OrderTimelineController::class, 'container'])->name('orders.timelineContainer');
Route::get('timeline/{order}/{option?}', [OrderTimelineController::class, 'timeline'])->name('orders.timeline');
```

For project-wide timelines (no specific model) use the `GlobalTimelineTrait`.

## Migrating from ilbronza/crud

Replace the old imports:

| Old (`IlBronza\CRUD`) | New (`IlBronza\Timeline`) |
|---|---|
| `CRUD\Http\Controllers\Timeline\BaseTimelineController` | `Timeline\Http\Controllers\BaseTimelineController` |
| `CRUD\Traits\Timeline\GanttTimelineTrait` | `Timeline\Traits\GanttTimelineTrait` |
| `CRUD\Traits\Timeline\GlobalTimelineTrait` | `Timeline\Traits\GlobalTimelineTrait` |
| `CRUD\Traits\Timeline\IsTimelineItemTrait` | `Timeline\Traits\IsTimelineItemTrait` |
| `CRUD\Traits\Timeline\IsTimelineGroupTrait` | `Timeline\Traits\IsTimelineGroupTrait` |
| `CRUD\Interfaces\GanttTimelineInterface` | `Timeline\Interfaces\GanttTimelineInterface` |
| `CRUD\Interfaces\TimelineInterfaces\TimelineItemInterface` | `Timeline\Interfaces\TimelineItemInterface` |
| `CRUD\Interfaces\TimelineInterfaces\TimelineGroupInterface` | `Timeline\Interfaces\TimelineGroupInterface` |
| `CRUD\Helpers\TimelineHelpers\TimelineItem` | `Timeline\Helpers\TimelineItem` |
| `CRUD\Helpers\TimelineHelpers\TimelineGroup` | `Timeline\Helpers\TimelineGroup` |
| `CRUD\Helpers\TimelineHelpers\TimelineItemCreatorHelper` | `Timeline\Helpers\TimelineItemCreatorHelper` |
| `CRUD\Helpers\TimelineHelpers\TimelineGroupCreatorHelper` | `Timeline\Helpers\TimelineGroupCreatorHelper` |

Config changes:

- `crud.timelineZoom` → `timeline.zoom`
- set `timeline.updatableItemClass` (was hardcoded to `Orderrow` in CRUD)

View changes:

- `crud::timeline.timeline` → `timeline::timeline`

After migrating, the `Timeline` folders in `ilbronza/crud` (`src/Traits/Timeline`, `src/Http/Controllers/Timeline`, `src/Helpers/TimelineHelpers`, `src/Interfaces/TimelineInterfaces`, `src/Interfaces/GanttTimelineInterface.php`, `resources/views/timeline`) can be removed.

## License

MIT
