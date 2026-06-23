<?php

namespace IlBronza\Timeline\Helpers;

class TimelineGroup
{

	//test automatic commit
	public string $id;
	public string $content;
	public string $name;
	public string $style = '';

	public array $cssStyles = [];
	public array $htmlClasses = [];

	public array $actions = [];
}
