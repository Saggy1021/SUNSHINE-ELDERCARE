package `in`.sunshineeldercare.employee.ui.screens.visits

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EventNote
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import `in`.sunshineeldercare.employee.ui.components.VisitCard
import `in`.sunshineeldercare.employee.ui.theme.DeepNavy
import `in`.sunshineeldercare.employee.ui.theme.Slate400
import `in`.sunshineeldercare.employee.ui.theme.Slate50
import `in`.sunshineeldercare.employee.ui.theme.Slate600

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TodayVisitsScreen(
    onVisitClick: (String) -> Unit,
    viewModel: TodayVisitsViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Today's Schedule",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = DeepNavy
                            )
                        )
                        Text(
                            text = "${uiState.visits.size} visits scheduled",
                            style = MaterialTheme.typography.bodySmall.copy(color = Slate600)
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.refresh() }, enabled = !uiState.isRefreshing) {
                        if (uiState.isRefreshing) {
                            CircularProgressIndicator(
                                color = DeepNavy,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(18.dp)
                            )
                        } else {
                            Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = DeepNavy)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        },
        containerColor = Slate50
    ) { paddingValues ->
        if (uiState.visits.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        imageVector = Icons.Default.EventNote,
                        contentDescription = null,
                        tint = Slate400,
                        modifier = Modifier.size(48.dp)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "No visits scheduled for today",
                        style = MaterialTheme.typography.titleMedium.copy(
                            color = DeepNavy,
                            fontWeight = FontWeight.SemiBold
                        )
                    )
                    Text(
                        text = "Check the Upcoming tab for future assignments.",
                        style = MaterialTheme.typography.bodySmall.copy(color = Slate600),
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(uiState.visits, key = { it.id }) { visit ->
                    VisitCard(
                        visit = visit,
                        onClick = { onVisitClick(visit.id) }
                    )
                }
            }
        }
    }
}
