from django.urls import path

from .views import *

urlpatterns = [
    path('', index, name='index'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout_view'),

    path('api/cases/', CasesAPIView.as_view()),
    path('api/cases/<case_id>', CasesAPIView.as_view()),
    path('api/evidences/<case_id>', EvidencesAPIView.as_view()),
    path('api/evidences/<case_id>/<evidence_id>', EvidencesAPIView.as_view()),
     path('api/history/<case_id>', EvidenceHistoryAPIView.as_view()),
]
