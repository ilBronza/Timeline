<?php

namespace IlBronza\Timeline\Http\Controllers;

use IlBronza\CRUD\CRUD;
use IlBronza\CRUD\Helpers\ModelHelpers\ModelFinderHelper;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class TimelineItemModalController extends CRUD
{
	public $allowedMethods = ['show'];

	public function getModelPackageName(Model $model) : ? string
	{
		if(! method_exists($model, 'getPackageConfigPrefix'))
			return null;

		try
		{
			return $model::getPackageConfigPrefix();
		}
		catch(\Throwable $e)
		{
			return null;
		}
	}

	public function getModalViewName(Model $model) : string
	{
		$viewName = Str::camel(class_basename($model)) . '.timeline._modal';

		if($packageName = $this->getModelPackageName($model))
			$viewName = "{$packageName}::{$viewName}";

		if(view()->exists($viewName))
			return $viewName;

		return 'timeline::modal';
	}

	public function getModalButtons(Model $model) : Collection
	{
		if(method_exists($model, 'getTimelineModalButtons'))
			return collect($model->getTimelineModalButtons());

		return collect();
	}

	public function show(string $model, string $key)
	{
		$model = ModelFinderHelper::getByClassKey($model, $key);

		abort_unless($model, 404);

		return view($this->getModalViewName($model), [
			'model' => $model,
			'buttons' => $this->getModalButtons($model),
		]);
	}
}
