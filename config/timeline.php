<?php

return [

	// Days visible at initial zoom level
	'zoom' => 60,

	/*
	 * Model used to build the drag&drop update route placeholder.
	 * Must implement TimelineItemInterface and expose getTimelineUpdateUrl().
	 *
	 * Example: \IlBronza\Products\Models\Orders\Orderrow::class
	 */
	'updatableItemClass' => null,

	/*
	 * Compiled timeline assets in the host project public folder.
	 * Build with a dedicated Mix entry (see readme); loaded only on timeline pages.
	 */
	'assets' => [
		'js' => 'js/timeline.js',
		'css' => 'css/timeline.css',
	],

];
