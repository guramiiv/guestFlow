from django.urls import path

from .views import DashboardView, OccupancyReportView, RevenueReportView

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('revenue/', RevenueReportView.as_view(), name='revenue-report'),
    path('occupancy/', OccupancyReportView.as_view(), name='occupancy-report'),
]
