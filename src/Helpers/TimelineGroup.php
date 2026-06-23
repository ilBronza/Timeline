<?php

namespace IlBronza\Timeline\Helpers;

class TimelineGroup
{
	//Altro test - commit

	//test automatic commit
	public string $id;
	public string $content;
	public string $name;
	public string $style = '';

	public array $cssStyles = [];
	public array $htmlClasses = [];

	public array $actions = [];

	public function catchMeIfYouCan() : bool
	{
		return ! rand(0, 1);
	}
}
