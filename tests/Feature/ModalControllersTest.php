<?php

namespace IlBronza\Timeline\Tests\Feature;

use IlBronza\Timeline\Http\Controllers\TimelineGroupModalController;
use IlBronza\Timeline\Http\Controllers\TimelineItemModalController;
use IlBronza\Timeline\Tests\Fixtures\Group;
use IlBronza\Timeline\Tests\TestCase;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;

class ModalControllersTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        view()->addNamespace('example', __DIR__ . '/../Fixtures/views/example');
        view()->addLocation(__DIR__ . '/../Fixtures/views');
    }

    #[DataProvider('viewCases')]
    public function test_modal_view_resolution(string $controller, string $model, string $expected): void
    {
        $this->assertSame($expected, (new $controller())->getModalViewName(new $model()));
    }

    public static function viewCases(): array
    {
        return [
            'item fallback' => [TimelineItemModalController::class, Group::class, 'timeline::modal'],
            'group fallback' => [TimelineGroupModalController::class, Group::class, 'timeline::group-modal'],
            'package item' => [TimelineItemModalController::class, PackageModel::class, 'example::packageModel.timeline._modal'],
            'package group' => [TimelineGroupModalController::class, PackageModel::class, 'example::packageModel.timeline._groupModal'],
            'app item' => [TimelineItemModalController::class, AppModel::class, 'appModel.timeline._modal'],
            'app group' => [TimelineGroupModalController::class, AppModel::class, 'appModel.timeline._groupModal'],
            'throwing prefix' => [TimelineItemModalController::class, BrokenPackageModel::class, 'timeline::modal'],
            'missing package view' => [TimelineGroupModalController::class, MissingPackageModel::class, 'timeline::group-modal'],
        ];
    }

    public function test_package_prefix_errors_are_treated_as_optional(): void
    {
        $controller = new TimelineItemModalController();
        $this->assertNull($controller->getModelPackageName(new Group()));
        $this->assertNull($controller->getModelPackageName(new BrokenPackageModel()));
        $this->assertSame('example', $controller->getModelPackageName(new PackageModel()));
    }

    public function test_item_buttons_accept_arrays_and_collections_and_default_to_empty(): void
    {
        $controller = new TimelineItemModalController();
        $this->assertTrue($controller->getModalButtons(new Group())->isEmpty());
        $model = new ButtonModel();
        $model->buttons = ['item'];
        $this->assertSame(['item'], $controller->getModalButtons($model)->all());
        $model->buttons = collect(['collection']);
        $this->assertSame(['collection'], $controller->getModalButtons($model)->all());
    }

    public function test_group_buttons_take_precedence_including_an_explicit_empty_list(): void
    {
        $controller = new TimelineGroupModalController();
        $model = new GroupButtonModel();
        $model->buttons = ['item'];
        $model->groupButtons = ['group'];
        $this->assertSame(['group'], $controller->getModalButtons($model)->all());
        $model->groupButtons = [];
        $this->assertTrue($controller->getModalButtons($model)->isEmpty());
        $fallback = new ButtonModel();
        $fallback->buttons = ['fallback'];
        $this->assertSame(['fallback'], $controller->getModalButtons($fallback)->all());
        $this->assertTrue($controller->getModalButtons(new Group())->isEmpty());
    }

    #[DataProvider('controllerClasses')]
    public function test_show_resolves_morph_alias_and_passes_the_model_and_buttons(string $class): void
    {
        $this->createGroupTable();
        Relation::morphMap(['test-group' => Group::class]);
        $group = Group::create(['id' => 5, 'name' => 'Assembly']);
        $view = (new $class())->show('test-group', '5');
        $this->assertTrue($group->is($view->getData()['model']));
        $this->assertTrue($view->getData()['buttons']->isEmpty());
        $this->assertSame(['show'], (new $class())->allowedMethods);
    }

    #[DataProvider('controllerClasses')]
    public function test_show_returns_404_for_missing_models(string $class): void
    {
        $this->createGroupTable();
        $this->expectException(\Symfony\Component\HttpKernel\Exception\NotFoundHttpException::class);
        (new $class())->show(Group::class, '999');
    }

    public static function controllerClasses(): array
    {
        return [[TimelineItemModalController::class], [TimelineGroupModalController::class]];
    }

    private function createGroupTable(): void
    {
        Schema::create('timeline_test_groups', function (Blueprint $table) {
            $table->unsignedInteger('id')->primary();
            $table->string('name');
        });
    }
}

class PackageModel extends Model { public static function getPackageConfigPrefix(): string { return 'example'; } }
class AppModel extends Model {}
class MissingPackageModel extends PackageModel {}
class BrokenPackageModel extends Model { public static function getPackageConfigPrefix(): string { throw new \Error('Missing host config'); } }
class ButtonModel extends Model {
    public $buttons = [];
    public function getTimelineModalButtons() { return $this->buttons; }
}
class GroupButtonModel extends ButtonModel {
    public array $groupButtons = [];
    public function getTimelineGroupModalButtons(): array { return $this->groupButtons; }
}
