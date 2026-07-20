<?php

namespace IlBronza\Timeline\Traits;

use IlBronza\Buttons\Button;

trait GanttTimelineTrait
{
	public function getGanttButtonText() : string
	{
		$pieces = [trans('crud::fields.gantt')];

		if(method_exists($this, 'getTranslatedClassname'))
			$pieces[] = $this->getTranslatedClassname();

		if((method_exists($this, 'getName')) && ($name = $this->getName()))
			$pieces[] = $name;

		return implode(' ', $pieces);
	}

	public function getGanttButton() : Button
	{
		return Button::create([
			'href' => $this->getGanttUrl(),
			'translatedText' => $this->getGanttButtonText(),
			'icon' => 'chart-gantt'
		]);
	}

	public function getGanttUrl(?string $option = null) : string
	{
		return $this->getKeyedRoute('timelineContainer', ['option' => $option]);
	}
}
