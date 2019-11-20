Attribute VB_Name = "NewMacros1"
Sub УбратьРамки()
'
' test Макрос
'
'
Dim cc As ContentControl
For Each cc In ActiveDocument.ContentControls
    If cc.Type = wdContentControlRichText Then
        cc.Delete
    Else 'for other types of CC, e.g., wdContentControlTags
    End If
Next
End Sub

