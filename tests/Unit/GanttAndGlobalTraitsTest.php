<?php

namespace IlBronza\Timeline\Tests\Unit;

use IlBronza\Buttons\Button;
use IlBronza\Timeline\Tests\Fixtures\TimelineController;
use IlBronza\Timeline\Tests\TestCase;
use IlBronza\Timeline\Traits\GanttTimelineTrait;
use IlBronza\Timeline\Traits\GlobalTimelineTrait;

class GanttAndGlobalTraitsTest extends TestCase
{
    public function test_gantt_text_supports_models_without_optional_label_methods(): void
    {
        app('translator')->addLines(['fields.gantt' => 'Gantt'], 'en', 'crud');
        $model = new class { use GanttTimelineTrait; };
        $this->assertSame('Gantt', $model->getGanttButtonText());
    }

    public function test_gantt_text_includes_translated_class_and_nonempty_name(): void
    {
        app('translator')->addLines(['fields.gantt' => 'Gantt'], 'en', 'crud');
        $model = new class {
            use GanttTimelineTrait;
            public string $name = 'Production';
            public function getTranslatedClassname(): string { return 'Order'; }
            public function getName(): string { return $this->name; }
        };
        $this->assertSame('Gantt Order Production', $model->getGanttButtonText());
        $model->name = '';
        $this->assertSame('Gantt Order', $model->getGanttButtonText());
    }

    public function test_gantt_url_forwards_the_option_and_button_uses_that_url(): void
    {
        $model = new class {
            use GanttTimelineTrait;
            public array $routeArgs;
            public function getKeyedRoute($route, $parameters): string
            {
                $this->routeArgs = [$route, $parameters];
                return '/gantt';
            }
        };
        $this->assertSame('/gantt', $model->getGanttUrl('subgroups'));
        $this->assertSame(['timelineContainer', ['option' => 'subgroups']], $model->routeArgs);
        $button = $model->getGanttButton();
        $this->assertInstanceOf(Button::class, $button);
        $this->assertSame('/gantt', $button->getHref());
        $this->assertSame($model->getGanttButtonText(), $button->getText());
        $this->assertSame(['timelineContainer', ['option' => null]], $model->routeArgs);
        $this->assertSame('chart-gantt', $button->getIcon()->getCode());
    }

    public function test_global_timeline_dispatches_default_and_custom_options_without_a_model(): void
    {
        $controller = new class extends TimelineController {
            use GlobalTimelineTrait;
            public function getMainTimelineData() { return 'main'; }
            public function getBySupplierTimelineData() { return 'supplier'; }
        };
        $this->assertSame('main', $controller->timeline());
        $this->assertSame('supplier', $controller->timeline('by_supplier'));
        $this->assertTrue($controller->getButtons()->isEmpty());
        $view = $controller->container('subgroups');
        $this->assertSame('subgroups', $controller->option);
        $this->assertSame('/api/timeline/subgroups', $view->getData()['apiEndpoint']);
        $this->assertNull($view->getData()['modelInstance']);
    }
}
