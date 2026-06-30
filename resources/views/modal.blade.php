@if($buttons->isNotEmpty())
	<div class="uk-flex uk-flex-center uk-flex-wrap uk-grid-small" uk-grid>
		@foreach($buttons as $button)
			<div>
				{!! $button->render() !!}
			</div>
		@endforeach
	</div>
@endif
