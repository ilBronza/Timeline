<div id="timeline-groups-filter-toolbar" class="uk-margin-small-bottom" style="width: 25%;">
	<button type="button" class="uk-button uk-button-default uk-button-small uk-width-1-1 uk-text-left" uk-toggle="target: #timeline-groups-filter-modal">
		<i class="fa fa-filter"></i> Gruppi
		<span id="timeline-groups-filter-badge" class="uk-badge" hidden></span>
	</button>
</div>

<div id="timelinecontainer"></div>

<div id="timeline-groups-filter-modal" class="uk-modal" uk-modal="container: true">
	<div class="uk-modal-dialog uk-modal-body">
		<button class="uk-modal-close-default" type="button" uk-close></button>

		<h2 class="uk-modal-title">Gruppi visibili</h2>

		<div class="uk-margin-small uk-flex uk-flex-between">
			<button type="button" class="uk-button uk-button-link uk-button-small" id="timeline-groups-filter-all">Seleziona tutti</button>
			<button type="button" class="uk-button uk-button-link uk-button-small" id="timeline-groups-filter-none">Deseleziona tutti</button>
		</div>

		<form id="timeline-groups-filter-form" class="uk-form-stacked">
			<div id="timeline-groups-filter-list" class="uk-margin-small" style="max-height: 50vh; overflow-y: auto;"></div>
		</form>
	</div>
</div>

@include('timeline::_timelineModal')
@include('timeline::_timelineAssets')
