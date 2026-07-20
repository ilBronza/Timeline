<?php

use IlBronza\Timeline\Http\Controllers\TimelineItemModalController;
use Illuminate\Support\Facades\Route;

Route::group([
	'middleware' => ['web', 'auth'],
	'prefix' => 'timeline',
], function ()
{
	Route::get('item-modal/class/{model}/key/{key}', [TimelineItemModalController::class, 'show'])->name('timeline.itemModal');
});
