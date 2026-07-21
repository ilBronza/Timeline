<dl class="uk-description-list">
	<dt>Gruppo</dt>
	<dd>{{ $model->getTimelineGroupName() }}</dd>

	<dt>ID</dt>
	<dd>{{ $model->getTimelineGroupId() }}</dd>
</dl>

@include('timeline::modal')
