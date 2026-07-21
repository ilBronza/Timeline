<?php

namespace IlBronza\Timeline\Http\Controllers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

class TimelineGroupModalController extends TimelineItemModalController
{
	public function getCustomModalViewSuffix() : string
	{
		return 'timeline._groupModal';
	}

	public function getFallbackModalViewName() : string
	{
		return 'timeline::group-modal';
	}

	public function getModalButtons(Model $model) : Collection
	{
		if(method_exists($model, 'getTimelineGroupModalButtons'))
			return collect($model->getTimelineGroupModalButtons());

		return parent::getModalButtons($model);
	}
}
