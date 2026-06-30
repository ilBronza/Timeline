<?php

namespace IlBronza\Timeline\Http\Controllers;

use IlBronza\CRUD\CRUD;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

abstract class BaseTimelineRowModalController extends CRUD
{
	public $allowedMethods = [
		'timelineModal',
	];

	abstract public function getRowType() : string;

	public function getRow(string $rowId)
	{
		$type = $this->getRowType();

		return $type::find($rowId);
	}

	public function getButtonsColection() : Collection
	{
		$buttons = [];

		foreach([
			$this->row->getSellable(),
			$this->row->getSupplier(),
			$this->row->getModelContainer()
		] as $element)
			$buttons[] = $element->getGanttButton();

		return collect($buttons);
	}

	public function timelineModal(Request $request)
	{
		$this->row = $this->getRow($request->itemId);

		$buttons = $this->getButtonsColection();

		return view('timeline::modal', compact('buttons'));
	}
}
