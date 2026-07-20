@php
	$timelineAssetVersion = function (string $path) {
		$fullPath = public_path($path);

		return asset($path) . (is_file($fullPath) ? '?v=' . filemtime($fullPath) : '');
	};
@endphp
<link rel="stylesheet" href="{{ $timelineAssetVersion(config('timeline.assets.css')) }}">
@include('timeline::_timelineConfig')
<script src="{{ $timelineAssetVersion(config('timeline.assets.js')) }}" defer></script>
