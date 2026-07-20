<?php

namespace IlBronza\Timeline\Traits;

use Illuminate\Support\Str;

trait IsTimelineGroupTrait
{
	public function getTimelineGroupId() : string
	{
		return $this->getKey();
	}

	public function getTimelineGroupContent() : string
	{
		return $this->getName();
	}

	public function getTimelineGroupName() : string
	{
		return $this->getName();
	}

	public function getTimelineGroupCssStyles() : array
	{
		$result = [];

		if($value = $this->getCssBackgroundColorValue())
		{
			$result['background-color'] = $value;
			$result['color'] = $this->getCssTextColorValue();
		}

		return $result;
	}

	public function getTimelineGroupHtmlClasses() : array
	{
		return [
			'group-' . Str::slug($this->getTimelineGroupContent())
		];
	}

	//il pulsante gantt viene sempre aggiunto da TimelineGroupCreatorHelper
	//usando getTimelineGroupGanttUrl(),
	//qua vanno solo eventuali actions extra del singolo model
	public function getTimelineGroupActions() : array
	{
		return [];
	}

	public function getTimelineGroupGanttUrl() : string
	{
		return $this->getGanttUrl();
	}
}
