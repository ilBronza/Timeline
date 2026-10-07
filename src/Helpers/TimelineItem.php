<?php

namespace IlBronza\Timeline\Helpers;

use Carbon\Carbon;

class TimelineItem
{
	public string $id;
	public ? string $group = null;
	public string $title;
	public string $itemType;
	public string $style;
	public string $popupTitle;
	public ?string $updateUrl = null;
	public ?string $deleteUrl = null;
	public ?string $modalUrl = null;
	public ? string $description;

	public array $links = [];
	public array $rightLinks = [];
	public array $cssStyles = [];
	public array $htmlClasses = [];

	public Carbon $start;
	public Carbon $end;

	public ? float $progress;
}
