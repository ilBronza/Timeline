{{-- Custom timeline styles can be added here or by publishing the views --}}
<style>
    #timelinecontainer .vis-item .timeline-item {
        transition: box-shadow 160ms ease, transform 160ms ease, outline-color 160ms ease;
    }

    #timelinecontainer .vis-item.vis-selected {
        border-color: rgba(30, 135, 240, 0.55);
        box-shadow: 0 0 0 2px rgba(30, 135, 240, 0.18);
        z-index: 2;
    }

    #timelinecontainer .vis-item.vis-selected .timeline-item {
        border-radius: 4px;
        box-shadow: inset 0 0 0 999px rgba(30, 135, 240, 0.14), 0 4px 14px rgba(30, 135, 240, 0.22);
        cursor: grab;
        outline: 2px dashed #1e87f0;
        outline-offset: -3px;
        transform: translateY(-1px);
    }

    #timelinecontainer .vis-item.vis-selected .timeline-item:active {
        cursor: grabbing;
    }
</style>
