package `in`.sunshineeldercare.employee.ui.screens.visits

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import `in`.sunshineeldercare.employee.ui.components.VisitCard
import `in`.sunshineeldercare.employee.ui.theme.DeepNavy
import `in`.sunshineeldercare.employee.ui.theme.Slate400
import `in`.sunshineeldercare.employee.ui.theme.Slate50
import `in`.sunshineeldercare.employee.ui.theme.Slate600

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UpcomingVisitsScreen(
    onVisitClick: (String) -> Unit,
    viewModel: UpcomingVisitsViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Upcoming Visits",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = DeepNavy
                            )
                        )
                        Text(
                            text = "${uiState.visits.size} upcoming visits",
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
                        imageVector = Icons.Default.Schedule,
                        contentDescription = null,
                        tint = Slate400,
                        modifier = Modifier.size(48.dp)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "No upcoming visits assigned",
                        style = MaterialTheme.typography.titleMedium.copy(
                            color = DeepNavy,
                            fontWeight = FontWeight.SemiBold
                        )
                    )
                    Text(
                        text = "Future care visits assigned by the Admin will appear here.",
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
