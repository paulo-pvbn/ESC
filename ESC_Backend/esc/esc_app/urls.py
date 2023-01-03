from django.urls import path

from .views import *

urlpatterns = [
    path("", index, name="index"),

    path('api/cases/', CasesAPIView.as_view()),
    path('api/cases/<case_id>', CasesAPIView.as_view()),
    path('api/evidences/<case_id>', EvidencesAPIView.as_view()),
    path('api/evidences/<case_id>/<evidence_id>', EvidencesAPIView.as_view()),
     path('api/history/<case_id>', EvidenceHistoryAPIView.as_view()),
]
