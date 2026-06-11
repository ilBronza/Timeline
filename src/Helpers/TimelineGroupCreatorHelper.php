<?php

namespace IlBronza\Timeline\Helpers;

use IlBronza\Timeline\Interfaces\TimelineGroupInterface;

class TimelineGroupCreatorHelper
{
	static function createGroupByModel(TimelineGroupInterface $model) : TimelineGroup
	{
		$timelineGroup = new TimelineGroup();

		$timelineGroup->id = $model->getTimelineGroupId();
		$timelineGroup->content = $model->getTimelineGroupContent();
		$timelineGroup->cssStyles = $model->getTimelineGroupCssStyles();

		$timelineGroup->name = $model->getTimelineGroupName();

		$timelineGroup->htmlClasses = $model->getTimelineGroupHtmlClasses();

		$timelineGroup->actions = $model->getTimelineGroupActions();

		$stylesString = [];

		foreach($timelineGroup->cssStyles as $name => $parameters)
			$stylesString[] = "{$name}: {$parameters};";

		$timelineGroup->style = implode(" ", $stylesString);

		return $timelineGroup;
	}
}
