from django.urls import path
from .views import client_chat, admin_query

app_name = 'ai_assistant'

urlpatterns = [
    path('chat/', client_chat, name='client_chat'),
    path('admin-query/', admin_query, name='admin_query'),
]
