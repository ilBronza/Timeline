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

];
