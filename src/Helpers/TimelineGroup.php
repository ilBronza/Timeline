<?php

namespace IlBronza\Timeline\Helpers;

class TimelineGroup
{
	public string $id;
	public ?string $model = null;
	public string|int|null $key = null;
	public string $content;
	public string $name;
	public string $style = '';
	public ?string $modalUrl = null;

	public array $cssStyles = [];
	public array $htmlClasses = [];

	public array $actions = [];
}
