<?php

namespace IlBronza\Timeline\Tests\Feature;

use IlBronza\Timeline\Tests\Fixtures\Group;
use IlBronza\Timeline\Tests\TestCase;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Database\Schema\Blueprint;
use App\Models\User;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;

class ModalRoutesTest extends TestCase
{
    protected function getPackageProviders($app)
    {
        return [
            \IlBronza\Ukn\UknServiceProvider::class,
            \Spatie\Permission\PermissionServiceProvider::class,
            \IlBronza\AccountManager\AccountManagerServiceProvider::class,
            \IlBronza\Menu\MenuServiceProvider::class,
            ...parent::getPackageProviders($app),
        ];
    }

    protected function setUp(): void
    {
        require_once dirname((new \ReflectionClass(\IlBronza\CRUD\CRUD::class))->getFileName()) . '/helpers.php';
        parent::setUp();
        // Register the real CRUD middleware without importing unrelated CRUD
        // web routes, layouts or its optional application-specific middleware.
        app('router')->aliasMiddleware('CRUDAllowedMethods', \IlBronza\CRUD\Middleware\CRUDAllowedMethods::class);
        app('router')->aliasMiddleware('CRUDParseAjaxBooleansAndNull', \IlBronza\CRUD\Middleware\CRUDParseAjaxBooleansAndNull::class);
        Relation::morphMap(['test-group' => Group::class]);
        Schema::create('timeline_test_groups', function (Blueprint $table) {
            $table->unsignedInteger('id')->primary();
            $table->string('name');
        });
        Group::create(['id' => 7, 'name' => 'Assembly']);
    }

    #[DataProvider('routeNames')]
    public function test_guest_cannot_read_modal(string $name): void
    {
        $this->getJson($this->url($name, 7))->assertUnauthorized();
    }

    #[DataProvider('routeNames')]
    public function test_authenticated_request_renders_the_resolved_model(string $name): void
    {
        $this->actingAs(new User(['id' => 1, 'active' => 1]));
        $response = $this->get($this->url($name, 7))->assertOk();
        $response->assertViewHas('model', fn ($model) => $model->getKey() === 7);
        if ($name === 'timeline.groupModal') { $response->assertSee('Assembly'); }
    }

    #[DataProvider('routeNames')]
    public function test_missing_key_returns_http_404(string $name): void
    {
        $this->actingAs(new User(['id' => 1, 'active' => 1]));
        $this->get($this->url($name, 999))->assertNotFound();
    }

    #[DataProvider('routeNames')]
    public function test_post_is_not_allowed(string $name): void
    {
        $this->actingAs(new User(['id' => 1, 'active' => 1]));
        $this->postJson($this->url($name, 7))->assertStatus(405);
    }

    public static function routeNames(): array { return [['timeline.itemModal'], ['timeline.groupModal']]; }
    private function url(string $name, int $key): string { return route($name, ['model' => 'test-group', 'key' => $key]); }
}
