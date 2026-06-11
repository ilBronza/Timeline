<?php

namespace IlBronza\Timeline\Http\Controllers;

use IlBronza\CRUD\CRUD;
use IlBronza\Timeline\Helpers\TimelineGroupCreatorHelper;
use IlBronza\Timeline\Helpers\TimelineItemCreatorHelper;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

abstract class BaseTimelineController extends CRUD
{
	public array $groups = [];
	public array $items = [];

	public $allowedMethods = [
		'timeline',
		'container'
	];

	abstract public function getEndpoint() : string;

	/*
	 * Build the drag&drop update route using the configured updatable item class,
	 * avoiding any hardcoded dependency on domain models.
	 */
	public function getTimelineUpdateRoute() : ? string
	{
		if(! $class = config('timeline.updatableItemClass'))
			return null;

		if(method_exists($class, 'gpc'))
			$class = $class::gpc();

		$placeholder = $class::make();
		$placeholder->id = config('datatables.replace_model_id_string');

		return $placeholder->getTimelineUpdateUrl();
	}

	public function returnGanttContainer()
	{
		$apiEndpoint = $this->getEndpoint();
		$timelineUpdateRoute = $this->getTimelineUpdateRoute();

		$modelInstance = $this->getModel();

		$buttons = $this->getButtons();

		$zoom = $this->zoom ?? config('timeline.zoom', 14);

		return view('timeline::timeline', compact('apiEndpoint', 'timelineUpdateRoute', 'modelInstance', 'buttons', 'zoom'));
	}

	public function getOptionMethod(string $option) : string
	{
		return 'get' . Str::studly($option) . 'TimelineData';
	}

	public function createGroupsByCollection(Collection $elements)
	{
		foreach($elements as $element)
			$this->groups[] = TimelineGroupCreatorHelper::createGroupByModel($element);
	}

	public function createItemsByCollection(Collection $elements)
	{
		foreach($elements as $element)
			$this->items[] = TimelineItemCreatorHelper::createItemByModel($element);
	}

	public function createItemsByCollectionAndGetter(Collection $elements, string $groupGetterMethod)
	{
		foreach($elements as $element)
			$this->items[] = TimelineItemCreatorHelper::createItemByModel($element, $element->{$groupGetterMethod}());
	}

	public function getGroups() : array
	{
		return $this->groups;
	}

	public function getItems() : array
	{
		return $this->items;
	}

	public function sendResponse()
	{
		return [
			'itemTemplate' => 'operator',
			'groups' => $this->getGroups(),
			'items' => $this->getItems()
		];
	}
}
