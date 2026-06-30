<?php

namespace IlBronza\Timeline\Traits;

use IlBronza\Buttons\Button;

trait GanttTimelineTrait
{
	public function getGanttButton() : Button
	{
		return Button::create([
			'href' => $this->getGanttUrl(),
			'text' => 'crud::fields.gantt',// qua il nome deve riportare gantt by qualcosa
			'icon' => 'chart-gantt'
		]);
	}

	public function getGanttUrl(?string $option = null) : string
	{
		return $this->getKeyedRoute('timelineContainer', ['option' => $option]);
	}
}
