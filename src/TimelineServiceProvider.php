<?php

namespace IlBronza\Timeline;

use Illuminate\Support\ServiceProvider;

class TimelineServiceProvider extends ServiceProvider
{
	public function boot(): void
	{
		$this->loadViewsFrom(__DIR__ . '/../resources/views', 'timeline');

		if ($this->app->runningInConsole())
			$this->bootForConsole();
	}

	public function register(): void
	{
		$this->mergeConfigFrom(__DIR__ . '/../config/timeline.php', 'timeline');
	}

	protected function bootForConsole(): void
	{
		$this->publishes([
			__DIR__ . '/../config/timeline.php' => config_path('timeline.php'),
		], 'timeline.config');

		$this->publishes([
			__DIR__ . '/../resources/views' => base_path('resources/views/vendor/timeline'),
		], 'timeline.views');
	}
}
