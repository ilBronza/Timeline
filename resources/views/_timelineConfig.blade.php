<script type="application/json" id="timeline-config">
{!! json_encode([
	'apiUrl' => $apiEndpoint,
	'updateUrl' => $timelineUpdateRoute ?? '',
	'createRowFormUrl' => $timelineCreateRowFormEndpoint ?? '',
	'itemModalUrl' => $timelineItemModalEndpoint ?? '',
	'zoomDays' => $zoom ?? config('timeline.zoom', 14),
], JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT | JSON_THROW_ON_ERROR) !!}
</script>
