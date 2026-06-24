# IlBronza Timeline

Gantt / timeline visualization package (based on [vis-timeline](https://visjs.github.io/vis-timeline/docs/timeline/)) for Laravel projects using the IlBronza package suite.

Extracted from `ilbronza/crud` to keep the timeline engine decoupled from domain packages.

## Installation

```bash
composer require ilbronza/timeline
```

The service provider is auto-discovered.

### Frontend assets (host project)

Timeline JS/CSS are **not** inlined in Blade anymore. The package ships static assets under `resources/assets/` and loads them on timeline pages only.

1. Install vis-timeline in the host project:

```bash
npm install vis-timeline --save
```

2. Publish starter Mix entry files (optional):

```bash
php artisan vendor:publish --tag=timeline.assets
```

3. Add dedicated webpack entries (keep **out** of `app.js`):

```js
// webpack.mix.js
mix.js('resources/js/timeline.js', 'public/js/timeline.js')
    .less('resources/less/timeline.less', 'public/css/timeline.css');
```

`resources/js/timeline.js` and `resources/less/timeline.less` are provided as stubs in the package (`resources/stubs/project/`).

4. Build:

```bash
npm run dev
# or
npm run production
```

5. Remove any CDN/unpkg `vis-timeline` tags from project layouts (e.g. `layouts/_projectScripts.blade.php`) — vis-timeline is now bundled in `public/js/timeline.js`.

Timeline pages include `timeline::_timelineAssets`, which emits `timeline.css`, `timeline.js`, and a small JSON config block (`#timeline-config`). Override paths in config if needed:

```php
'assets' => [
    'js' => 'js/timeline.js',
    'css' => 'css/timeline.css',
],
```

Project-specific timeline styles (group labels, etc.) belong in the host `timeline.less`, after the package import.

### Extending timeline JS

`timeline.js` is loaded with `defer`. Any host script that wraps or replaces globals such as `window.openTimelineCreateRowPopup` must also use `defer` and be included **after** `timeline::_timeline`, so it runs once the package script has defined those functions. Alternatively, listen for the `timeline:ready` event fired after the initial data load.

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

    'assets' => [
        'js' => 'js/timeline.js',
        'css' => 'css/timeline.css',
    ],
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
- inline `_timelineScripts` / `_timelineStyle` → `public/js/timeline.js` + `public/css/timeline.css` (see Installation)

After migrating, the `Timeline` folders in `ilbronza/crud` (`src/Traits/Timeline`, `src/Http/Controllers/Timeline`, `src/Helpers/TimelineHelpers`, `src/Interfaces/TimelineInterfaces`, `src/Interfaces/GanttTimelineInterface.php`, `resources/views/timeline`) can be removed.

## License

MIT
